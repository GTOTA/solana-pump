import { Pool, PoolClient } from 'pg';
import { TokenInfo } from '../analysis/types';

export interface TokenCreateDto extends Omit<TokenInfo, 'createdAt'> {
  createdAt?: Date;
}

export interface TokenUpdateDto extends Partial<TokenInfo> {}

export interface TokenFilters {
  minPrice?: number;
  maxPrice?: number;
  minMcp?: number;
  maxRugProbability?: number;
  isLPLocked?: boolean;
  isHoneypot?: boolean;
  status?: string;
  alert?: number;
}

export class TokenInfoRepository {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Executes a database operation within a transaction
   */
  private async executeInTransaction<T>(
    operation: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validates token data before database operations
   */
  private validateTokenData(data: TokenCreateDto | TokenUpdateDto): void {
    if ('price' in data && (data.price as number) < 0) {
      throw new Error('Price cannot be negative');
    }
    if ('mcp' in data && (data.mcp as number) < 0) {
      throw new Error('Market cap cannot be negative');
    }
    if ('rugProbability' in data && 
        ((data.rugProbability as number) < 0 || (data.rugProbability as number) > 1)) {
      throw new Error('Rug probability must be between 0 and 1');
    }
    if ('ca' in data && !data.ca?.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid contract address format');
    }
    if ('lp' in data && !data.lp?.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid LP address format');
    }
  }

  /**
   * Creates a new token record
   */
  async create(data: TokenCreateDto): Promise<TokenInfo> {
    this.validateTokenData(data);

    return this.executeInTransaction(async (client) => {
      const query = `
        INSERT INTO tokens (
          ca,
          lp,
          name,
          symbol,
          price,
          dev,
          mcp,
          initiallp,
          lpburn,
          honeypot,
          lplock,
          renounced,
          nomint,
          blacklist,
          burnt,
          liq,
          created_at,
          holder,
          dev_percent,
          top10,
          rug_probability,
          top_holders_distribution,
          team_holdings,
          twitter_id,
          pump_5m,
          pump_1h,
          pump_6h,
          txs,
          txvol,
          open,
          status,
          alert
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
          $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32
        )
        RETURNING *
      `;

      const topHoldersJson = data.topHoldersDistribution 
        ? JSON.stringify(Object.fromEntries(data.topHoldersDistribution))
        : null;

      const values = [
        data.ca.toLowerCase(),
        data.lp.toLowerCase(),
        data.name,
        data.symbol,
        data.price,
        data.dev,
        data.mcp,
        data.initiallp,
        data.lpburn,
        data.honeypot,
        data.lplock,
        data.renounced,
        data.nomint,
        data.blacklist,
        data.burnt,
        data.liq,
        data.createdAt || new Date(),
        data.holder,
        data.devPercent,
        data.top10,
        data.rugProbability,
        topHoldersJson,
        data.teamHoldings,
        data.twitterId,
        data.pump5m,
        data.pump1h,
        data.pump6h,
        data.txs,
        data.txvol,
        data.open,
        data.status,
        data.alert
      ];

      try {
        const result = await client.query(query, values);
        return this.mapToTokenInfo(result.rows[0]);
      } catch (error) {
        if (error instanceof Error) {
          if ((error as any).code === '23505') { // Unique violation
            throw new Error(`Token with contract address ${data.ca} already exists`);
          }
          throw new Error(`Failed to create token: ${error.message}`);
        }
        throw new Error('Failed to create token: An unknown error occurred');
      }
    });
  }

  /**
   * Finds a token by contract address
   */
  async findByContractAddress(ca: string): Promise<TokenInfo | null> {
    if (!ca.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid contract address format');
    }

    const query = `
      SELECT * FROM tokens
      WHERE ca = $1 AND deleted_at IS NULL
    `;

    try {
      const result = await this.pool.query(query, [ca.toLowerCase()]);
      return result.rows[0] ? this.mapToTokenInfo(result.rows[0]) : null;
    } catch (error) {
      throw new Error(`Failed to find token: ${error}`);
    }
  }

  /**
   * Finds all tokens matching the given filters
   */
  async findAll(filters: TokenFilters = {}): Promise<TokenInfo[]> {
    const conditions: string[] = ['deleted_at IS NULL'];
    const values: any[] = [];
    let paramCount = 1;

    if (typeof filters.minPrice === 'number') {
      conditions.push(`price >= $${paramCount}`);
      values.push(filters.minPrice);
      paramCount++;
    }

    if (typeof filters.maxPrice === 'number') {
      conditions.push(`price <= $${paramCount}`);
      values.push(filters.maxPrice);
      paramCount++;
    }

    if (typeof filters.minMcp === 'number') {
      conditions.push(`mcp >= $${paramCount}`);
      values.push(filters.minMcp);
      paramCount++;
    }

    if (typeof filters.maxRugProbability === 'number') {
      conditions.push(`rug_probability <= $${paramCount}`);
      values.push(filters.maxRugProbability);
      paramCount++;
    }

    if (typeof filters.isLPLocked === 'boolean') {
      conditions.push(`lplock = $${paramCount}`);
      values.push(filters.isLPLocked);
      paramCount++;
    }

    if (typeof filters.isHoneypot === 'boolean') {
      conditions.push(`honeypot = $${paramCount}`);
      values.push(filters.isHoneypot);
      paramCount++;
    }

    if (filters.status) {
      conditions.push(`status = $${paramCount}`);
      values.push(filters.status);
      paramCount++;
    }

    if (typeof filters.alert === 'number') {
      conditions.push(`alert = $${paramCount}`);
      values.push(filters.alert);
      paramCount++;
    }

    const query = `
      SELECT * FROM tokens
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, values);
      return result.rows.map(row => this.mapToTokenInfo(row));
    } catch (error) {
      throw new Error(`Failed to find tokens: ${error}`);
    }
  }

  /**
   * Updates a token record
   */
  async update(ca: string, data: TokenUpdateDto): Promise<TokenInfo> {
    this.validateTokenData(data);

    return this.executeInTransaction(async (client) => {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      const fieldMappings: Record<string, string> = {
        name: 'name',
        symbol: 'symbol',
        price: 'price',
        dev: 'dev',
        mcp: 'mcp',
        initiallp: 'initiallp',
        lpburn: 'lpburn',
        honeypot: 'honeypot',
        lplock: 'lplock',
        renounced: 'renounced',
        nomint: 'nomint',
        blacklist: 'blacklist',
        burnt: 'burnt',
        liq: 'liq',
        holder: 'holder',
        devPercent: 'dev_percent',
        top10: 'top10',
        rugProbability: 'rug_probability',
        topHoldersDistribution: 'top_holders_distribution',
        teamHoldings: 'team_holdings',
        twitterId: 'twitter_id',
        pump5m: 'pump_5m',
        pump1h: 'pump_1h',
        pump6h: 'pump_6h',
        txs: 'txs',
        txvol: 'txvol',
        open: 'open',
        status: 'status',
        alert: 'alert'
      };

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && key in fieldMappings) {
          if (key === 'topHoldersDistribution' && value instanceof Map) {
            updateFields.push(`${fieldMappings[key]} = $${paramCount}`);
            values.push(JSON.stringify(Object.fromEntries(value)));
          } else {
            updateFields.push(`${fieldMappings[key]} = $${paramCount}`);
            values.push(value);
          }
          paramCount++;
        }
      });

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE tokens
        SET ${updateFields.join(', ')}
        WHERE ca = $${paramCount} AND deleted_at IS NULL
        RETURNING *
      `;

      values.push(ca.toLowerCase());

      const result = await client.query(query, values);
      if (result.rows.length === 0) {
        throw new Error(`Token with contract address ${ca} not found`);
      }
      return this.mapToTokenInfo(result.rows[0]);
    });
  }

  /**
   * Soft deletes a token record
   */
  async delete(ca: string): Promise<void> {
    if (!ca.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid contract address format');
    }

    const query = `
      UPDATE tokens
      SET deleted_at = NOW()
      WHERE ca = $1 AND deleted_at IS NULL
    `;

    try {
      const result = await this.pool.query(query, [ca.toLowerCase()]);
      if (result.rowCount === 0) {
        throw new Error(`Token with contract address ${ca} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete token: ${error}`);
    }
  }

  /**
   * Maps a database record to a TokenInfo object
   */
  private mapToTokenInfo(row: any): TokenInfo {
    const token: TokenInfo = {
      ca: row.ca,
      lp: row.lp,
      name: row.name,
      symbol: row.symbol,
      price: row.price,
      dev: row.dev,
      mcp: row.mcp,
      initiallp: row.initiallp,
      lpburn: row.lpburn,
      honeypot: row.honeypot,
      lplock: row.lplock,
      renounced: row.renounced,
      nomint: row.nomint,
      blacklist: row.blacklist,
      burnt: row.burnt,
      liq: row.liq,
      createdAt: row.created_at,
      holder: row.holder,
      devPercent: row.dev_percent,
      top10: row.top10,
      rugProbability: row.rug_probability,
      teamHoldings: row.team_holdings,
      twitterId: row.twitter_id,
      pump5m: row.pump_5m,
      pump1h: row.pump_1h,
      pump6h: row.pump_6h,
      txs: row.txs,
      txvol: row.txvol,
      open: row.open,
      status: row.status,
      alert: row.alert
    };

    if (row.top_holders_distribution) {
      try {
        token.topHoldersDistribution = new Map(
          Object.entries(JSON.parse(row.top_holders_distribution))
        );
      } catch (error) {
        console.error('Failed to parse top holders distribution:', error);
        token.topHoldersDistribution = new Map();
      }
    }

    return token;
  }
}