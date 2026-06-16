export async function onRequestGet(context) {
    const { env } = context;

    try {
        let scores = [];

        try {
            const stored = await env.SCORES_KV.get('leaderboard');
            if (stored) {
                scores = JSON.parse(stored);
            }
        } catch (e) {
            console.log('KV not available');
        }

        const topScores = scores.slice(0, 50);

        return new Response(JSON.stringify({
            success: true,
            scores: topScores
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=10'
            }
        });
    } catch (error) {
        return new Response(JSON.stringify({
            success: false,
            scores: [],
            message: '获取排行榜失败'
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
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
