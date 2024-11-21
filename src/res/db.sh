-- 创建 tokens 表
//切换数据库用户 
# CREATE USER pumpuser WITH ENCRYPTED PASSWORD 'your_password';
# CREATE DATABASE pumpmonitor owner pumpuser;
# GRANT ALL PRIVILEGES ON DATABASE pumpmonitor TO pumpuser;

# psql -d exampledb -U pumpuser -h 127.0.0.1
# revoke all on database postgres from user1;
# drop user pump;
# psql -U pumpuser -d pumpmonitor  -h 127.0.0.1
CREATE TABLE tokens (
    contract_address TEXT PRIMARY KEY,
    name TEXT,
    symbol TEXT NOT NULL,
    price NUMERIC NOT NULL,
    dev TEXT,
    market_cap NUMERIC,
    lp_burn BOOLEAN,
    honeypot BOOLEAN,
    lp_lock BOOLEAN,
    renounced BOOLEAN,
    lp_vol NUMERIC,
    vol_24h NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    holder_count INTEGER,
    dev_percent NUMERIC,
    top10_percent NUMERIC,
    rug_probability NUMERIC,
    top_holders_distribution JSONB,
    team_holdings NUMERIC,
    twitter_id TEXT
);

-- 创建索引
CREATE INDEX idx_tokens_price ON tokens(price);
CREATE INDEX idx_tokens_market_cap ON tokens(market_cap);
CREATE INDEX idx_tokens_created_at ON tokens(created_at);