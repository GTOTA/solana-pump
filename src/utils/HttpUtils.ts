import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { ResponseTokenInfo } from './types';
//const axios = require('axios');
require('dotenv').config();

class RequestError extends Error {
    constructor(
        public message: string,
        public status?: number,
        public response?: AxiosResponse
    ) {
        super((response && response.config ? response.config.url : "") + message);
    }

    isApiException = true;
}

export class HttpApi {
    private axios: AxiosInstance;

    constructor(params: { baseUrl: string; apiKey: string }) {
        this.axios = axios.create({
            baseURL: params.baseUrl,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                'X-API-KEY': `${params.apiKey}`,
            },
        });

        this.axios.interceptors.response.use(
            (async (
                response: AxiosResponse<{
                    code: number;
                    msg: string;
                    data: any;
                }>
            ) => {
                if (response.status != 200) {
                    throw new RequestError(response.statusText);
                }
                return response.data;
            }) as any,
            (error) => {
                if (error.response) {
                    return Promise.reject(
                        new RequestError(
                            error.response.data,
                            error.response.status,
                            error.response
                        )
                    );
                }

                if (error.isAxiosError) {
                    return Promise.reject(new RequestError("noInternetConnection"));
                }
                return Promise.reject(error);
            }
        );
    }

    async getTokenInfo(tokenCA: string) {
        try {
            const response = await this.axios.get<null, ResponseTokenInfo>(
                `/v2/token/${tokenCA}`
            );
            return response;

        } catch (error) {
            // If there was an error, log it
            console.error('Error fetching price:', error);
        }
    }
}


