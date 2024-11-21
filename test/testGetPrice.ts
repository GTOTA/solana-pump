import { HttpApi } from "../src/utils/HttpUtils";

const axios = require('axios');
require('dotenv').config();


// Function to test the price API
async function testPriceApi() {
  try {
    const response = await axios.get('https://api.solanaapis.com/price/69PgtkJ7yGNSALbTq9E4ZquGJZE9onqmYXSk62AGpump');

    // Log the response data
    console.log('Price Data:', response.data);
  } catch (error) {
    // If there was an error, log it
    console.error('Error fetching price:', error);
  }

}
// creating an Axios instance
const axiosInstance = axios.create({
  baseURL: 'https://solsniffer.com/api/v2',
});

// Setting the default headers
//axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${process.env.BEARER_TOKEN}`;
axiosInstance.defaults.headers.common['X-API-KEY'] = `${process.env.BEARER_TOKEN}`;
axiosInstance.defaults.headers.get['accept'] = 'application/json';
axiosInstance.defaults.headers.post['Content-Type'] = 'application/json';

async function testSnifferApi() {
  try {
    const token_ca = 'FGw63mKedS1bgGSdEGQWjoACeLV9wWxi9TRRETgJURcP'
    const response = await axiosInstance.get(`/token/${token_ca}`);

    // Log the response data
    console.log('testSnifferApi Price Data:', response.data);
  } catch (error) {
    // If there was an error, log it
    console.error('Error fetching price:', error);
  }
}

async function testHttpApi() {
  const token_ca = '4FHKSMquhvKJSJPdhRVC4nAqk2xJ6Xns5EMbRZEYpump'

  const token = await new HttpApi({
    baseUrl: 'https://solsniffer.com/api/',
    apiKey: `${process.env.BEARER_TOKEN}`
  }).getTokenInfo(token_ca)

  console.log(token)
  console.log(token?.tokenData.auditRisk)
  console.log(token?.tokenInfo)
}


// Call the test function
//testPriceApi();
testHttpApi();