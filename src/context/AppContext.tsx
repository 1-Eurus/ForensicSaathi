import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Operator, EvidencePackage, TestSession, DashboardStats, AuditEvent,
} from '../types';
import {
  authApi, testsApi, auditApi, setToken, clearToken, TOKEN_KEY,
  type FPUser,
} from '../lib/api';

// ─── Extended EvidencePackage: adds v2 dual-image + GPS fields ───────────────
// (All new fields are optional so old records / pages continue to work)
declare module '../types' {
  interface EvidencePackage {
    testImageHash?: string;
    referenceImageHash?: string;
    testImageData?: string;
    referenceImageData?: string;
    testImageQuality?: number;
    referenceImageQuality?: number;
    environmentConsistency?: number;
    gpsAccuracy?: number;
    locationTimestamp?: string;
    locationSimulated?: boolean;
    captureTimeDiffSec?: number;
  }
}

interface AppContextValue {
  // Auth
  user: FPUser | null;
  operator: Operator | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;

  // Evidence records  (existing pages use EvidencePackage[])
  records: EvidencePackage[];
  addRecord: (record: EvidencePackage) => Promise<void>;
  updateRecord: (testId: string, updates: Partial<EvidencePackage>) => void;
  getRecord: (testId: string) => EvidencePackage | undefined;

  // Active session (for NewTestPage multi-step flow)
  activeSession: TestSession | null;
  setActiveSession: (session: TestSession | null) => void;
  updateSession: (updates: Partial<TestSession>) => void;

  // Audit trail (old shape: { id, timestamp, event, detail, actor, category })
  audit: AuditEvent[];

  // Dashboard stats
  stats: DashboardStats;

  // Demo tamper mode
  tamperedRecordId: string | null;
  setTamperedRecordId: (id: string | null) => void;

  // Loading state (true while initial auth check runs)
  loading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FPUser | null>(null);
  const [records, setRecords] = useState<EvidencePackage[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [activeSession, setActiveSession] = useState<TestSession | null>(null);
  const [tamperedRecordId, setTamperedRecordId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived operator from user (keeps existing pages working)
  const operator: Operator | null = user ? {
    id: user.operator_id,
    name: user.full_name,
    sessionId: `SES-${user.id.slice(0, 6).toUpperCase()}`,
    deviceId: `DEV-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
    role: user.role,
    loginTime: user.last_login_at ?? new Date().toISOString(),
  } : null;

  // ── Convert API audit events to old AuditEvent shape ────────────────────
  function mapApiAudit(events: any[]): AuditEvent[] {
    return events.map(e => ({
      id: e.id,
      timestamp: e.timestamp,
      event: e.action,     // API uses 'action'; old pages read '.event'
      detail: e.detail,
      actor: e.operator_id ?? 'SYSTEM',
      category: e.category,
    }));
  }

  // ── Restore EvidencePackage from API test record ──────────────────────────
  function testToEP(t: any): EvidencePackage | null {
    // evidence_package is stored as the full EP JSON — use it directly
    if (t.evidence_package && typeof t.evidence_package === 'object') {
      return t.evidence_package as EvidencePackage;
    }
    return null;
  }

  // ── Load data from API ────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [{ tests }, { events }] = await Promise.all([
        testsApi.list(),
        auditApi.list(),
      ]);
      const eps = tests.map(testToEP).filter(Boolean) as EvidencePackage[];
      setRecords(eps);
      setAudit(mapApiAudit(events));
    } catch (e) {
      console.error('[AppContext] loadData error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── On mount: restore session from JWT ────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(({ user: u }) => { setUser(u); return loadData(); })
      .catch(() => { clearToken(); setLoading(false); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string) => {
    const { token, user: u } = await authApi.login(username, password);
    setToken(token);
    setUser(u);
    setLoading(true);
    await loadData();
  }, [loadData]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setRecords([]);
    setAudit([]);
    setActiveSession(null);
    setTamperedRecordId(null);
    setLoading(false);
  }, []);

  // ── Add record ────────────────────────────────────────────────────────────
  const addRecord = useCallback(async (ep: EvidencePackage) => {
    // Persist to server — the whole EvidencePackage is stored as evidence_package JSON
    await testsApi.create({
      protocol_id: ep.protocolId,
      completed_at: ep.timestamp,
      result: ep.result,
      confidence_score: ep.confidence,
      evidence_quality_score: ep.imageQualityScore,
      calibration_status: ep.calibrationStatus,
      test_image_data: ep.testImageData,
      reference_image_data: ep.referenceImageData,
      test_image_hash: ep.testImageHash ?? ep.imageHash,
      reference_image_hash: ep.referenceImageHash ?? ep.imageHash,
      test_image_quality: ep.testImageQuality ?? ep.imageQualityScore,
      reference_image_quality: ep.referenceImageQuality ?? ep.imageQualityScore,
      environment_consistency: ep.environmentConsistency ?? 95,
      latitude: ep.latitude,
      longitude: ep.longitude,
      location_accuracy: ep.gpsAccuracy,
      location_timestamp: ep.locationTimestamp,
      location_simulated: ep.locationSimulated,
      evidence_hash: ep.evidenceHash,
      evidence_status: ep.evidenceStatus,
      verification_status: ep.verificationStatus,
      evidence_package: ep as any,
      audit_events: ep.auditTrail?.map(a => ({
        id: (a as any).id ?? Math.random().toString(36).slice(2),
        category: a.category,
        action: (a as any).event ?? a.id,
        detail: a.detail,
        timestamp: a.timestamp,
      })),
    });

    // Update local state immediately
    setRecords(prev => [ep, ...prev]);

    // Refresh audit from server
    auditApi.list()
      .then(({ events }) => setAudit(mapApiAudit(events)))
      .catch(() => {});
  }, []);

  // ── Update record ─────────────────────────────────────────────────────────
  const updateRecord = useCallback((testId: string, updates: Partial<EvidencePackage>) => {
    setRecords(prev => prev.map(r => r.testId === testId ? { ...r, ...updates } : r));
    // Sync verification/tamper status to server
    if (updates.verificationStatus !== undefined || updates.evidenceStatus !== undefined) {
      testsApi.update(testId, {
        verification_status: updates.verificationStatus,
        tampered: updates.evidenceStatus === 'TAMPERED',
      }).catch(console.error);
    }
  }, []);

  const getRecord = useCallback((testId: string) => {
    return records.find(r => r.testId === testId);
  }, [records]);

  const updateSession = useCallback((updates: Partial<TestSession>) => {
    setActiveSession(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const stats: DashboardStats = {
    totalTests: records.length,
    todayTests: records.filter(r => {
      const d = new Date(r.timestamp);
      return d.toDateString() === new Date().toDateString();
    }).length,
    presumptivePositive: records.filter(r => r.result === 'PRESUMPTIVE_POSITIVE').length,
    inconclusive: records.filter(r => r.result === 'INCONCLUSIVE').length,
    evidenceSealed: records.filter(r => r.evidenceStatus === 'SEALED').length,
    integrityFailures: records.filter(r => r.verificationStatus === 'FAILED').length,
  };

  return (
    <AppContext.Provider value={{
      user, operator, login, logout,
      records, addRecord, updateRecord, getRecord,
      activeSession, setActiveSession, updateSession,
      audit, stats,
      tamperedRecordId, setTamperedRecordId,
      loading,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
