const fs = require('fs');
const axios = require('axios');
const querystring = require('querystring');

function parseQueryParams(query) {
    return querystring.parse(query);
}

const getCommonHeaders = (authorizationToken, xCustomToken) => ({
    'accept': 'application/json, text/plain, */*',
    'accept-encoding': 'gzip, deflate, br, zstd',
    'accept-language': 'en-US,en;q=0.9',
    'authorization': `Bearer ${authorizationToken.trim()}`,
    'cache-control': 'no-cache',
    'connection': 'keep-alive',
    'content-type': 'application/json',
    'host': 'api.flashflash.vip',
    'origin': 'https://tma.flashflash.vip',
    'pragma': 'no-cache',
    'referer': 'https://tma.flashflash.vip/',
    'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24", "Microsoft Edge";v="128", "Microsoft Edge WebView2";v="128"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 Edg/128.0.0.0',
    'x-custom-token': `Bearer ${xCustomToken.trim()}` 
});

async function getTasks(authorizationToken, xCustomToken) {
    try {
        const response = await axios.get('https://api.flashflash.vip/task', {
            headers: getCommonHeaders(authorizationToken, xCustomToken)
        });

        const tasks = response.data;

        if (tasks.length === 0) {
            console.log('All Tasks Already Claimed 100%');
            return;
        }

        console.log('Tasks:');
        tasks.forEach(task => {
            console.log(`${task.id} | ${task.prize} | ${task.title}`);
        });

        for (const task of tasks) {
            await postTask(task.id, authorizationToken, xCustomToken);
        }

    } catch (error) {
        console.error('Error fetching tasks:', error.response ? error.response.data : error.message);
    }
}

async function postTask(taskId, authorizationToken, xCustomToken) {
    try {
        await axios.post('https://api.flashflash.vip/task', 
            { id: taskId },
            {
                headers: getCommonHeaders(authorizationToken, xCustomToken)
            }
        );
        console.log(`Task ${taskId} posted successfully.`);
    } catch (error) {
        console.error(`Error posting task ${taskId}:`, error.response ? error.response.data : error.message);
    }
}

async function dailyLogin(authorizationToken, xCustomToken) {
    try {
        await axios.post(
            'https://tma.flashflash.vip/task/daily',
            {},
            {
                headers: getCommonHeaders(authorizationToken, xCustomToken)
            }
        );
        console.log('Daily login successful.');
    } catch (error) {
        if (error.response && error.response.data.message === 'Cannot claim daily task again!') {
            console.log('Daily Already Claimed');
        } else {
            console.error('Error during daily login:', error.response ? error.response.data : error.message);
        }
    }
}

fs.readFile('auth.txt', 'utf8', async (err, data) => {
    if (err) {
        console.error('Error reading auth.txt:', err);
        return;
    }

    const accounts = data.split('\n').filter(line => line.trim() !== '');

    for (const [index, account] of accounts.entries()) {
        try {
            const params = parseQueryParams(account);
            const queryId = params.hash;
            const decodedUser = decodeURIComponent(params.user);

            const parsedUser = JSON.parse(decodedUser);

            const telegramUserId = parsedUser.id;
            const userName = `${parsedUser.first_name} ${parsedUser.last_name}`;
            const token = account.trim(); 

            const payload = {
                data: {
                    queryId,
                    telegramUserId,
                    referralCode: '',
                    userName,
                    token,
                    xCustomToken: ''
                }
            };

            const response = await axios.post(
                'https://api.flashflash.vip/auth/login',
                payload,
                {
                    headers: getCommonHeaders(token, 'Bearer')
                }
            );

            const { token: apiToken, user } = response.data;
            const xCustomToken = apiToken;

            console.log(`==================================================================`);
            console.log(`Response for Account ${index + 1} [Line ${index + 1} in auth.txt]:`);
            console.log(`Token: ${apiToken}`);
            console.log(`User: ${user.telegramUserId} | ${user.userName} | ${user.point}`);
            console.log(`ETH: ${user.ethWalletAddress ?? 'N/A'}`);
            console.log(`TON: ${user.tonWalletAddress ?? 'N/A'}`);
            console.log('');

            await dailyLogin(token, xCustomToken);
            await getTasks(token, xCustomToken);
        } catch (error) {
            console.error(`Error for account ${index + 1} [Line ${index + 1} in auth.txt]:`, error.response ? error.response.data : error.message);
        }
    }
});
