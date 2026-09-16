import { apiRequest } from '../api-client';

export interface LeaderboardRow { rank: number; alias: string; score: number; gradedAttempts: number; isYou: boolean }
export interface LeaderboardResponse { rows: LeaderboardRow[]; me: LeaderboardRow | null; eligibleCount: number }
export interface AttemptBadge { id: string; title: string; description: string; target: number; current: number; earned: boolean; earnedAt: string | null }
export interface BadgesResponse { badges: AttemptBadge[]; earnedCount: number }

export async function fetchLeaderboard() {
  return (await apiRequest<LeaderboardResponse>('/student/leaderboard')).data;
}
export async function fetchBadges() {
  return (await apiRequest<BadgesResponse>('/student/badges')).data;
}
