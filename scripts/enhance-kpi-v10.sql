-- KPI增强 v10：修复到期完成率和预警完成率
-- 后端逻辑：只查ACTIVE合同 + lease_end在窗口内 → 看unit.status是否OCCUPIED
-- 合同保持ACTIVE，通过unit.status区分已续约(OCCUPIED)/未续约(VACANT)
-- 执行：docker exec -i camp-postgres psql -U cdata -d cdata < scripts/enhance-kpi-v10.sql

-- ============================================================
-- 1. 即将到期(30天内)：10个活跃合同
--    6个铺位OCCUPIED（已续约）+ 4个VACANT（未续约）
--    → 到期完成率 ≈ 60%
-- ============================================================
DO $$
DECLARE
  r RECORD;
  days_ahead int;
  idx int := 0;
BEGIN
  FOR r IN (
    SELECT c.id as contract_id, u.id as unit_id
    FROM contracts c JOIN units u ON u.id=c.unit_id
    WHERE c.status='ACTIVE' AND u.status='OCCUPIED'
    ORDER BY c.monthly_rent DESC
    LIMIT 10
  )
  LOOP
    idx := idx + 1;
    days_ahead := 5 + (idx * 2) + FLOOR(RANDOM() * 3)::int;

    UPDATE contracts SET lease_end = CURRENT_DATE + (days_ahead || ' days')::interval
    WHERE id = r.contract_id;

    -- 后4个变为VACANT（未续约），合同保持ACTIVE
    IF idx > 6 THEN
      UPDATE units SET status='VACANT',
        vacancy_days = FLOOR(RANDOM()*10+1)::int
      WHERE id = r.unit_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. 预警期(31-90天)：14个活跃合同
--    9个OCCUPIED + 5个VACANT
--    → 预警完成率 ≈ 64.3%
-- ============================================================
DO $$
DECLARE
  r2 RECORD;
  days_ahead int;
  idx2 int := 0;
BEGIN
  FOR r2 IN (
    SELECT c.id as contract_id, u.id as unit_id
    FROM contracts c JOIN units u ON u.id=c.unit_id
    WHERE c.status='ACTIVE' AND u.status='OCCUPIED'
      AND c.lease_end > CURRENT_DATE + INTERVAL '30 days'  -- exclude already-adjusted
    ORDER BY c.monthly_rent DESC
    LIMIT 14
  )
  LOOP
    idx2 := idx2 + 1;
    days_ahead := 35 + (idx2 * 3) + FLOOR(RANDOM() * 5)::int;

    UPDATE contracts SET lease_end = CURRENT_DATE + (days_ahead || ' days')::interval
    WHERE id = r2.contract_id;

    IF idx2 > 9 THEN
      UPDATE units SET status='VACANT',
        vacancy_days = FLOOR(RANDOM()*20+15)::int
      WHERE id = r2.unit_id;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 3. 验证
-- ============================================================
SELECT '===== v10: 到期/预警完成率验证 =====' AS title;

SELECT '30天内到期(expiring)' AS cat,
  COUNT(*) AS total,
  SUM(CASE WHEN u.status='OCCUPIED' THEN 1 ELSE 0 END) AS occupied_done,
  SUM(CASE WHEN u.status='VACANT' THEN 1 ELSE 0 END) AS vacant_pending,
  ROUND(SUM(CASE WHEN u.status='OCCUPIED' THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*),0)*100, 1)||'%' AS completion_rate
FROM contracts c JOIN units u ON u.id=c.unit_id
WHERE c.status='ACTIVE'
  AND c.lease_end >= CURRENT_DATE
  AND c.lease_end <= CURRENT_DATE + INTERVAL '30 days';

SELECT '31-90天到期(warning)' AS cat,
  COUNT(*) AS total,
  SUM(CASE WHEN u.status='OCCUPIED' THEN 1 ELSE 0 END) AS occupied_done,
  SUM(CASE WHEN u.status='VACANT' THEN 1 ELSE 0 END) AS vacant_pending,
  ROUND(SUM(CASE WHEN u.status='OCCUPIED' THEN 1 ELSE 0 END)::numeric /
        NULLIF(COUNT(*),0)*100, 1)||'%' AS completion_rate
FROM contracts c JOIN units u ON u.id=c.unit_id
WHERE c.status='ACTIVE'
  AND c.lease_end > CURRENT_DATE + INTERVAL '30 days'
  AND c.lease_end <= CURRENT_DATE + INTERVAL '90 days';
