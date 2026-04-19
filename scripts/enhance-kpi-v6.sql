-- KPI增强 v6：修复剩余3个问题
-- 执行：docker exec -i camp-postgres psql -U cdata -d cdata < scripts/enhance-kpi-v6.sql

-- ============================================================
-- 1. 续约标记修复：使用AGE()函数比较租约长度
-- ============================================================
DO $$
BEGIN
  UPDATE contracts SET is_renewal = TRUE
  FROM (
    SELECT c.id FROM contracts c
    JOIN tenants t ON t.id = c.tenant_ref_id
    JOIN units u ON u.id = c.unit_id
    WHERE c.status IN ('ACTIVE','EXPIRING')
      AND u.status = 'OCCUPIED'
      AND t.brand_tier IN ('A','B')
      AND AGE(c.lease_end, c.lease_start) > INTERVAL '2 years'
      AND c.is_renewal = FALSE
    ORDER BY c.monthly_rent DESC
    LIMIT 25
  ) sub WHERE contracts.id = sub.id;
END $$;

-- 验证续签数量
SELECT '--- 续约标记结果 ---' AS s;
SELECT COUNT(*) FILTER (WHERE is_renewal=TRUE) AS 续签数,
       COUNT(*) FILTER (WHERE is_renewal=FALSE OR is_renewal IS NULL) AS 新签数,
       ROUND(COUNT(*) FILTER (WHERE is_renewal=TRUE)::numeric /
             NULLIF(COUNT(*),0)*100,1)||'%' AS 续签占比
FROM contracts WHERE status IN ('ACTIVE','EXPIRING');

-- ============================================================
-- 2. 插入续签合同（模拟本月完成的续签）
-- ============================================================
INSERT INTO contracts (unit_id, tenant_id, contract_number, status,
  lease_start, lease_end, monthly_rent, management_fee, deposit, currency,
  payment_frequency, ai_imported, notes, created_at, updated_at, is_renewal)
SELECT
  u.id, c.tenant_id,
  'RN-'||TO_CHAR(CURRENT_DATE,'YYMM')||'-'||LPAD((ROW_NUMBER() OVER())::text,4,'0'),
  'ACTIVE',
  GREATEST(c.lease_end, CURRENT_DATE) + INTERVAL '1 day',
  (GREATEST(c.lease_end, CURRENT_DATE) + INTERVAL '1 day')::date + INTERVAL '2 years',
  ROUND(c.monthly_rent*(1+(RANDOM()*0.2-0.05))::numeric,2),
  c.management_fee, c.deposit, c.currency,
  c.payment_frequency, FALSE,
  '续签合同 - 自动续约2年', NOW(), NOW(), TRUE
FROM contracts c JOIN units u ON u.id=c.unit_id
WHERE c.status='ACTIVE' AND u.status='OCCUPIED'
  AND c.is_renewal=FALSE AND (c.id*4)%7=0
LIMIT 14;

SELECT '--- 续签合同插入 ---' AS s;
SELECT COUNT(*) AS 新增续签合同数 FROM contracts
WHERE contract_number LIKE 'RN-%' AND is_renewal=TRUE;

-- ============================================================
-- 3. 租售比计算修复：使用正确的列名和类型
-- mock_business_data.tenant_id_ref (integer) = contracts.tenant_ref_id (integer)
-- ============================================================
UPDATE mock_business_data SET
  rent_to_sales_ratio = ROUND(
    (SELECT monthly_rent FROM contracts c
     WHERE c.tenant_ref_id = mock_business_data.tenant_id_ref
       AND c.status='ACTIVE' LIMIT 1)
    / NULLIF(monthly_sales, 0) * 100::numeric, 2)
WHERE data_date >= '2026-03-01' AND data_date < '2026-04-01'
  AND EXISTS (SELECT 1 FROM contracts c WHERE c.tenant_ref_id = mock_business_data.tenant_id_ref AND c.status='ACTIVE');

UPDATE mock_business_data SET
  rent_to_sales_ratio = ROUND(
    (SELECT monthly_rent FROM contracts c
     WHERE c.tenant_ref_id = mock_business_data.tenant_id_ref
       AND c.status='ACTIVE' LIMIT 1)
    / NULLIF(monthly_sales, 0) * 100::numeric, 2)
WHERE data_date >= '2026-04-01'
  AND EXISTS (SELECT 1 FROM contracts c WHERE c.tenant_ref_id = mock_business_data.tenant_id_ref AND c.status='ACTIVE');

SELECT '--- 租售比验证 ---' AS s;
SELECT TO_CHAR(data_date,'YYYY-MM-DD') AS 日期,
  ROUND(AVG(rent_to_sales_ratio)::numeric,2) AS 平均租售比,
  COUNT(*) AS 记录数
FROM mock_business_data
WHERE data_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY data_date ORDER BY data_date DESC;

-- ============================================================
-- 4. 最终综合验证
-- ============================================================
SELECT '===== CAMP KPI 增强最终验证 =====' AS title;

SELECT '核心指标' AS 类别,
  ROUND(COUNT(CASE WHEN status='OCCUPIED' THEN 1 END)::numeric/COUNT(*)*100,1)||'%' AS 出租率,
  (SELECT COUNT(*) FROM units WHERE status='VACANT' AND vacancy_days>=90)||'个' AS 预警空置,
  ROUND((SELECT COALESCE(SUM(monthly_rent),0)::numeric FROM contracts WHERE status='ACTIVE')/10000,1)||'万' AS 月租金
FROM units;

SELECT '签约结构' AS 类别,
  COUNT(*) FILTER (WHERE is_renewal=TRUE)||'个' AS 续签,
  COUNT(*) FILTER (WHERE is_renewal=FALSE OR is_renewal IS NULL)||'个' AS 新签,
  ROUND(COUNT(*) FILTER (WHERE is_renewal=TRUE)::numeric/
        NULLIF(COUNT(*),0)*100,1)||'%' AS 续签率
FROM contracts WHERE status IN ('ACTIVE','EXPIRING');

SELECT '招商计划' AS 类别,
  (SELECT COUNT(*) FROM leasing_plans WHERE status='completed')||'/'||
  (SELECT COUNT(*) FROM leasing_plans WHERE status NOT IN ('draft','cancelled'))||'个' AS 完成数,
  ROUND((SELECT COUNT(*) FILTER (WHERE completed_date IS NOT NULL AND completed_date<=due_date)::numeric
         FROM leasing_plans)/
        NULLIF((SELECT COUNT(*) FROM leasing_plans WHERE status NOT IN ('draft','cancelled')),0)*100,1)||'%' AS 按时率
FROM leasing_plans LIMIT 1;
