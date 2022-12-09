import '@nomiclabs/hardhat-waffle';
import 'dotenv/config';
import { HardhatUserConfig } from 'hardhat/config';

const CELO_URL = process.env.CELO_URL as string;
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

const config: HardhatUserConfig = {
  solidity: '0.8.17',
  networks: {
    celo: {
      url: CELO_URL,
      accounts: [PRIVATE_KEY],
    },
  },
};

export default config;
