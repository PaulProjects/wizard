import Chart from 'chart.js/auto';
import { GameData as gamedata } from "./game/gamedata.ts";
import { Logger } from "./logger.ts";

export class GameAnalyticsUI {
    private games: gamedata[];
    private charts: { [key: string]: Chart } = {};
    private isInitialized = false;

    constructor(games: gamedata[]) {
        this.games = games;
    }

    public render() {
        if (this.isInitialized) return; // Or maybe update? For now assume static data
        
        try {
            this.renderSummary();
            this.renderGamesOverTime();
            this.renderDurationDistribution();
            this.renderPlayerCounts();
            this.renderBettingBehavior();
            this.isInitialized = true;
        } catch (e) {
            Logger.error("Failed to render game analytics", { error: (e as Error).message });
        }
    }

    private renderSummary() {
        const completedGames = this.games.filter(g => !g.isActive);
        
        // Total Games
        const totalGames = completedGames.length;
        const elTotalGames = document.getElementById("ga-total-games");
        if(elTotalGames) elTotalGames.innerText = totalGames.toString();

        // Unique Players
        const uniquePlayers = new Set<string>();
        completedGames.forEach(g => {
            g.getPlayers().forEach(p => uniquePlayers.add(p));
        });
        const elTotalPlayers = document.getElementById("ga-total-players");
        if(elTotalPlayers) elTotalPlayers.innerText = uniquePlayers.size.toString();

        // Total Playtime
        let totalMs = 0;
        completedGames.forEach(g => {
             const start = g.getTimeStarted();
             const end = g.getTimeEnded();
             if (start && end) {
                 totalMs += (end - start);
             }
        });
        // Check if > 100 hours, then no decimals
        const hours = totalMs / (1000 * 60 * 60);
        const displayHours = hours > 100 ? hours.toFixed(0) : hours.toFixed(1);
        
        const elTotalPlaytime = document.getElementById("ga-total-playtime");
        if(elTotalPlaytime) elTotalPlaytime.innerText = `${displayHours}h`;

        // Total Rounds
        let totalRounds = 0;
        completedGames.forEach(g => {
            // Use score length as proxy for completed rounds to be safe
             totalRounds += g.getScore().length;
        });
        const elTotalRounds = document.getElementById("ga-total-rounds");
        if(elTotalRounds) elTotalRounds.innerText = totalRounds.toString();
    }

    private renderGamesOverTime() {
        const ctx = document.getElementById('chart-games-over-time') as HTMLCanvasElement;
        if (!ctx) return;
        
        if (this.charts['gamesOverTime']) this.charts['gamesOverTime'].destroy();

        // Sort games by date
        const sortedGames = [...this.games].filter(g => !g.isActive).sort((a,b) => a.getTimeStarted() - b.getTimeStarted());
        
        if (sortedGames.length === 0) return;

        // Group by Month or Week? Month seems good
        const dataMap = new Map<string, number>();
        
        // Find min and max date to fill gaps
        const firstGame = sortedGames[0];
        const lastGame = sortedGames[sortedGames.length - 1];
        
        if (firstGame && lastGame) {
            let currentDate = new Date(firstGame.getTimeStarted());
            // Reset to first day of month
            currentDate.setDate(1); 
            const endDate = new Date(lastGame.getTimeStarted());
            
            while (currentDate <= endDate || (currentDate.getMonth() === endDate.getMonth() && currentDate.getFullYear() === endDate.getFullYear())) {
                const key = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
                dataMap.set(key, 0); // Initialize with 0
                // Next month
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
        }

        // Fill user data
        sortedGames.forEach(g => {
            const d = new Date(g.getTimeStarted());
            const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`; // YYYY-MM
            dataMap.set(key, (dataMap.get(key) || 0) + 1);
        });

        const labels = Array.from(dataMap.keys());
        const values = Array.from(dataMap.values());

        this.charts['gamesOverTime'] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Games Played',
                    data: values,
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { precision: 0 },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' } 
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    private renderDurationDistribution() {
         const ctx = document.getElementById('chart-duration-distribution') as HTMLCanvasElement;
        if (!ctx) return;
        
        if (this.charts['duration']) this.charts['duration'].destroy();

        // durations in minutes
        const durations = this.games
            .filter(g => !g.isActive && g.getTimeEnded())
            .map(g => {
                return (g.getTimeEnded()! - g.getTimeStarted()) / 60000;
            })
            .filter(d => d > 0 && d < 600); // Filter unrealistic ones

        // Buckets: <30, 30-45, 45-60, 60-90, 90+
        const buckets = { '< 30': 0, '30-45': 0, '45-60': 0, '60-90': 0, '90+': 0 };
        durations.forEach(d => {
            if (d < 30) buckets['< 30']++;
            else if (d < 45) buckets['30-45']++;
            else if (d < 60) buckets['45-60']++;
            else if (d < 90) buckets['60-90']++;
            else buckets['90+']++;
        });

        this.charts['duration'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(buckets),
                datasets: [{
                    label: 'Games',
                    data: Object.values(buckets),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.6)',
                        'rgba(54, 162, 235, 0.6)',
                        'rgba(255, 206, 86, 0.6)',
                        'rgba(75, 192, 192, 0.6)',
                        'rgba(153, 102, 255, 0.6)',
                    ],
                }]
            },
            plugins: [{
                id: 'barLabels',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    ctx.save();
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                            const data = dataset.data[index] as number;
                            if (data > 0) {
                                ctx.fillStyle = 'gray';
                                ctx.font = 'bold 12px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(data.toString(), element.x, element.y - 5);
                            }
                        });
                    });
                    ctx.restore();
                }
            }],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                 scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { precision: 0 },
                        grid: { display: false }
                    },
                    x: {
                        grid: { display: false },
                        title: {
                            display: true,
                            text: 'Duration (Minutes)'
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    private renderPlayerCounts() {
        const ctx = document.getElementById('chart-player-counts') as HTMLCanvasElement;
        if (!ctx) return;
        
        if (this.charts['playerCounts']) this.charts['playerCounts'].destroy();

        const countsMap = new Map<number, number>();
        let totalGames = 0;

        this.games.filter(g => !g.isActive).forEach(g => {
            const c = g.getPlayers().length;
            countsMap.set(c, (countsMap.get(c) || 0) + 1);
            totalGames++;
        });

        const sortedKeys = Array.from(countsMap.keys()).sort((a,b) => a - b);
        const labels = sortedKeys.map(k => `${k} Players`);
        const values = sortedKeys.map(k => countsMap.get(k)!);
        const maxVal = Math.max(...values, 0);

        this.charts['playerCounts'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Games',
                    data: values,
                    backgroundColor: [
                         'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                         'rgba(75, 192, 192, 0.7)',
                         'rgba(153, 102, 255, 0.7)',
                         'rgba(255, 159, 64, 0.7)'
                    ],
                }]
            },
            plugins: [{
                id: 'playerCountLabels',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    ctx.save();
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                            const data = dataset.data[index] as number;
                            if (data > 0) {
                                const percentage = ((data / totalGames) * 100).toFixed(1);
                                ctx.fillStyle = 'gray';
                                ctx.font = 'bold 12px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(`${data} (${percentage}%)`, element.x, element.y - 5);
                            }
                        });
                    });
                    ctx.restore();
                }
            }],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { 
                        beginAtZero: true, 
                        ticks: { precision: 0 },
                        grid: { display: false },
                        suggestedMax: maxVal * 1.2
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    private renderBettingBehavior() {
       const ctx = document.getElementById('chart-betting-accuracy') as HTMLCanvasElement;
       const statEl = document.getElementById('stat-avg-deviation');
        if (!ctx) return;
        
        if (this.charts['betting']) this.charts['betting'].destroy();

        let totalRounds = 0;
        let sumDeviation = 0;
        // -2+: Over-estimated significantly
        // -1: Over-estimated by 1
        // 0: Perfect
        // +1: Under-estimated by 1
        // +2+: Under-estimated significantly
        const deviationDist = { '-2+': 0, '-1': 0, '0': 0, '+1': 0, '+2+': 0 };

        this.games.filter(g => !g.isActive).forEach(g => {
            const bets = g.bets || [];
            const tricks = g.tricks || [];
             // Bets/tricks are array of arrays [round][player]
             for(let r=0; r < g.round; r++) {
                 if (!bets[r] || !tricks[r]) continue;
                 for(let p=0; p < g.players.length; p++) {
                     if (bets[r][p] === undefined || tricks[r][p] === undefined) continue;
                     
                     // Diff = Tricks - Bets
                     // Diff > 0: Won more than bet (Underestimated) -> +1
                     // Diff < 0: Won less than bet (Overestimated) -> -1
                     
                     const diff = tricks[r][p] - bets[r][p];
                     
                     sumDeviation += Math.abs(diff);
                     totalRounds++;
                     
                     if (diff === 0) deviationDist['0']++;
                     else if (diff === -1) deviationDist['-1']++;
                     else if (diff === 1) deviationDist['+1']++;
                     else if (diff < -1) deviationDist['-2+']++;
                     else if (diff > 1) deviationDist['+2+']++;
                 }
             }
        });

        if (statEl && totalRounds > 0) {
            statEl.innerText = (sumDeviation / totalRounds).toFixed(2);
        }

        const bettingData = [deviationDist['-2+'], deviationDist['-1'], deviationDist['0'], deviationDist['+1'], deviationDist['+2+']];
        const maxVal = Math.max(...bettingData, 0);

        this.charts['betting'] = new Chart(ctx, {
            type: 'bar',
            data: {
                // Labels: Tricks - Bets
                labels: ['Too Optimistic (<-1)', 'Too Optimistic (-1)', 'Spot On (0)', 'Too Pessimistic (+1)', 'Too Pessimistic (>1)'],
                datasets: [{
                    label: 'Rounds',
                    data: bettingData,
                     backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 159, 64, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                         'rgba(153, 102, 255, 0.7)',
                    ],
                }]
            },
            plugins: [{
                id: 'barLabels',
                afterDatasetsDraw(chart) {
                    const { ctx } = chart;
                    ctx.save();
                    chart.data.datasets.forEach((dataset, i) => {
                        const meta = chart.getDatasetMeta(i);
                        meta.data.forEach((element, index) => {
                            const data = dataset.data[index] as number;
                            if (data > 0) {
                                ctx.fillStyle = 'gray';
                                ctx.font = 'bold 12px sans-serif';
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'bottom';
                                ctx.fillText(data.toString(), element.x, element.y - 5);
                            }
                        });
                    });
                    ctx.restore();
                }
            }],
            options: {
                 responsive: true,
                maintainAspectRatio: false,
                 scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { display: false },
                        suggestedMax: maxVal * 1.15
                    },
                    x: {
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });

    }
}
