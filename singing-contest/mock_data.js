// mock_data.js —— 必須這樣寫！
export const CONTEST_STATES = {
    IDLE: 'IDLE',
    READY: 'READY',
    VOTING: 'VOTING',
    ENDED: 'ENDED',
    REVEAL_CANDIDATES: 'REVEAL_CANDIDATES',
    REVEAL_FINAL: 'REVEAL_FINAL'
};

export const INITIAL_SINGERS = [
    { 
        id: 'singer-1', 
        name: '神秘歌手 A', 
        photo: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38?q=80&w=1000&auto=format&fit=crop', 
        description: '擅長高音與轉音' 
    },
    { 
        id: 'singer-2', 
        name: '神秘歌手 B', 
        photo: 'https://images.unsplash.com/photo-1520785643438-5bf77931f493?q=80&w=1000&auto=format&fit=crop', 
        description: '深情款款的低音炮' 
    },
    { 
        id: 'singer-3', 
        name: '神秘歌手 C', 
        photo: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000&auto=format&fit=crop', 
        description: '爆發力十足的搖滾嗓' 
    }
];