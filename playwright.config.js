import { defineConfig } from '@playwright/test';
export default defineConfig({testDir:'./browser-tests',timeout:60000,workers:1,use:{baseURL:'http://127.0.0.1:3000',headless:true,launchOptions:{args:['--disable-background-timer-throttling','--disable-renderer-backgrounding']}},webServer:{command:'npm start',url:'http://127.0.0.1:3000/health',reuseExistingServer:false}});
