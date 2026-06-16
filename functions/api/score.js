export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { score, username, browserId, coins, distance, difficulty, timestamp } = body;

        if (!browserId || typeof score !== 'number') {
            return new Response(JSON.stringify({
                success: false,
                message: '无效的数据'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                }
            });
        }

        const sanitizedId = browserId.substring(0, 30).replace(/[<>]/g, '');
        const sanitizedUsername = (username || '匿名玩家').substring(0, 12).replace(/[<>]/g, '');

        const entry = {
            score: Math.floor(score),
            username: sanitizedUsername,
            browserId: sanitizedId,
            coins: coins || 0,
            distance: distance || 0,
            difficulty: difficulty || 'normal',
            timestamp: timestamp || Date.now()
        };

        let scores = [];
        try {
            const stored = await env.SCORES_KV.get('leaderboard');
            if (stored) {
                scores = JSON.parse(stored);
            }
        } catch (e) {
            console.log('KV not available, using memory storage');
        }

        const existingIndex = scores.findIndex(s => s.browserId === sanitizedId);
        if (existingIndex >= 0) {
            const existing = scores[existingIndex];
            existing.username = sanitizedUsername;
            if (entry.score > existing.score) {
                existing.score = entry.score;
                existing.coins = entry.coins;
                existing.distance = entry.distance;
                existing.difficulty = entry.difficulty;
            }
            existing.timestamp = entry.timestamp;
        } else {
            scores.push(entry);
        }

        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 50);

        try {
            await env.SCORES_KV.put('leaderboard', JSON.stringify(scores));
        } catch (e) {
            console.log('KV storage failed, data not persisted');
        }

        const rank = scores.findIndex(s => s.browserId === sanitizedId) + 1;

        return new Response(JSON.stringify({
            success: true,
            message: '分数提交成功',
            rank: rank
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            message: '服务器错误: ' + error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
