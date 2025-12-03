export const CONTEST_STATES = {
    IDLE: 'IDLE',               // Waiting for start
    READY: 'READY',             // Singer selected, ready to vote
    VOTING: 'VOTING',           // Voting in progress
    ENDED: 'ENDED',             // Voting ended, waiting for reveal
    REVEAL_CANDIDATES: 'REVEAL_CANDIDATES', // Show top 5 voted options
    REVEAL_FINAL: 'REVEAL_FINAL' // Show final answer and stats
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
