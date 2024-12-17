const express = require('express');
const axios = require('axios');
const app = express();
const cors = require('cors');
const port = 6000;

app.use(cors({
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru']
}));

const ApiKey = '42e15a4cba4a0de57aa36c01b7bd4594';
const PlacementUrl = 'https://api3.adsterratools.com/publisher/placements.json';
const StatsUrl = 'https://api3.adsterratools.com/publisher/stats.json';

const SecondApiKey = '';
const SecondPlacementUrl = '';
const SecondStatsUrl = '';

async function get1Banner() {
    let banner = null;

    try {
        const response = await axios.get(PlacementUrl, {
            headers: {
                'X-API-Key': ApiKey,
                'Accept': 'application/json'
            }
        });
        if (response.data.items && response.data.items.length > 0) {
            banner = response.data.items.find(item => item.direct_url);
        } else {
            console.log('No banner items found in response.');
        }
    } catch (error) {
        if (error.response) {
            console.error(`Failed to fetch banner from Adsterra:`, error.response.data);
        } else {
            console.error(`Failed to fetch banner from Adsterra:`, error.message);
        }
    }

    return banner;
}

async function get1Stats() {
    let stats = null;

    try {
        const response = await axios.get(StatsUrl, {
            headers: {
                'X-API-Key': ApiKey,
                'Accept': 'application/json'
            },
            params: {
                start_date: '2024-09-05',
                finish_date: '2024-09-10',
                group_by: 'date'
            }
        });
        stats = response.data;
        console.log('Stats received from Adsterra:', stats);
    } catch (error) {
        if (error.response) {
            console.error(`Failed to fetch stats from Adsterra:`, error.response.data);
        } else {
            console.error(`Failed to fetch stats from Adsterra:`, error.message);
        }
    }

    return stats;
}

async function get2Banner() {
    let banner = null;

    try {
        const response = await axios.get(SecondPlacementUrl, {
            headers: {
                'X-API-Key': SecondApiKey,
                'Accept': 'application/json'
            }
        });
        if (response.data.items && response.data.items.length > 0) {
            banner = response.data.items.find(item => item.direct_url);
        } else {
            console.log('No banner items found in response from second network.');
        }
    } catch (error) {
        if (error.response) {
            console.error(`Failed to fetch banner from second network:`, error.response.data);
        } else {
            console.error(`Failed to fetch banner from second network:`, error.message);
        }
    }

    return banner;
}

async function get2Stats() {
    let stats = null;

    try {
        const response = await axios.get(SecondStatsUrl, {
            headers: {
                'X-API-Key': SecondApiKey,
                'Accept': 'application/json'
            },
            params: {
                start_date: '2024-09-05',
                finish_date: '2024-09-10',
                group_by: 'date'
            }
        });
        stats = response.data;
        console.log('Stats received from second network:', stats);
    } catch (error) {
        if (error.response) {
            console.error(`Failed to fetch stats from second network:`, error.response.data);
        } else {
            console.error(`Failed to fetch stats from second network:`, error.message);
        }
    }

    return stats;
}

app.get('/best-offer', async (req, res) => {
    const banner1 = await get1Banner();
    const banner2 = await get2Banner();
    const stats1 = await get1Stats();
    const stats2 = await get2Stats();

    console.log('Using stats for comparison:', stats1, stats2);

    let bannerUrl = null;
    if (banner1 && banner1.direct_url) {
        bannerUrl = banner1.direct_url;
    } else if (banner2 && banner2.direct_url) {
        bannerUrl = banner2.direct_url;
    } else {
        console.log('No banners available from both networks.');
    }

    console.log('Banner URL to be returned:', bannerUrl);
    res.json({ url: bannerUrl });
});

app.listen(port, () => {
    console.log(`Server is running on http://www.serpmonn.ru:${port}`);
});
