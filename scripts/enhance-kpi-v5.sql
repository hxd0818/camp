-- KPI可视化深度增强脚本 v5（最终修复版）
-- 执行：docker exec -i camp-postgres psql -U cdata -d cdata < scripts/enhance-kpi-v5.sql

-- ============================================================
-- 1. 到期铺出空：将一些active合同到期后unit变为vacant
-- ============================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT c.id as contract_id, u.id as unit_id,
           (c.lease_end - CURRENT_DATE) as diff_days
    FROM contracts c JOIN units u ON u.id = c.unit_id
    WHERE c.status = 'ACTIVE'
      AND c.lease_end BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '60 days'
      AND u.status = 'OCCUPIED'
    ORDER BY c.lease_end ASC
    LIMIT 8
  )
  LOOP
    UPDATE contracts SET status = 'EXPIRED' WHERE id = r.contract_id;
    UPDATE units SET status = 'VACANT',
      vacancy_days = GREATEST(EXTRACT(DAY FROM r.diff_days)::int, 0) + FLOOR(RANDOM() * 15 + 5)::int
    WHERE id = r.unit_id;
  END LOOP;
END $$;

DO $$
DECLARE
  r2 RECORD;
BEGIN
  FOR r2 IN (
    SELECT c.id, u.id,
           GREATEST((CURRENT_DATE - c.lease_end), 0) as days_expired
    FROM contracts c JOIN units u ON u.id = c.unit_id
    WHERE c.status = 'ACTIVE' AND u.status = 'OCCUPIED'
      AND c.lease_end < CURRENT_DATE - INTERVAL '15 days'
    ORDER BY c.lease_end ASC
    LIMIT 6
  )
  LOOP
    UPDATE contracts SET status = 'EXPIRED' WHERE id = r2.id;
    UPDATE units SET status = 'VACANT',
      vacancy_days = r2.days_expired::int + FLOOR(RANDOM() * 30 + 10)::int
    WHERE id = r2.id;
  END LOOP;
END $$;

-- ============================================================
-- 2. 预警铺出空：增加长期空置(vacancy_days>=90)的面积
-- ============================================================
DO $$
BEGIN
  UPDATE units SET vacancy_days = vacancy_days + FLOOR(RANDOM() * 120 + 60)::int
  FROM (SELECT id FROM units WHERE status='VACANT' AND vacancy_days<90 AND id%3=0 ORDER BY RANDOM() LIMIT 12) t
  WHERE units.id=t.id;

  UPDATE units SET vacancy_days = vacancy_days + FLOOR(RANDOM() * 80 + 30)::int
  FROM (SELECT id FROM units WHERE status='VACANT' AND vacancy_days BETWEEN 91 AND 150 AND id%2=0 ORDER BY RANDOM() LIMIT 8) t
  WHERE units.id=t.id;

  UPDATE units SET vacancy_days = vacancy_days + FLOOR(RANDOM() * 200 + 100)::int
  FROM (SELECT id FROM units WHERE status='VACANT' AND vacancy_days<365 AND id%4=0 ORDER BY RANDOM() LIMIT 6) t
  WHERE units.id=t.id;
END $$;

UPDATE units SET vacancy_days = FLOOR(RANDOM()*180+90)::int WHERE status='RESERVED';

-- ============================================================
-- 3. 提升招商按时完成率
-- ============================================================
UPDATE leasing_plans SET status='completed',
  completed_area=target_area, completed_units=CEIL(target_units*0.95),
  completed_date=due_date-INTERVAL'35 days' WHERE id=12;

UPDATE leasing_plans SET status='completed',
  completed_area=CEIL(target_area*0.88), completed_units=CEIL(target_units*0.85),
  completed_date=due_date-INTERVAL'25 days' WHERE id=13;

UPDATE leasing_plans SET status='completed',
  completed_area=CEIL(target_area*0.82), completed_units=CEIL(target_units*0.78),
  completed_date=due_date-INTERVAL'18 days' WHERE id=21;

UPDATE leasing_plans SET status='completed',
  completed_area=target_area, completed_units=CEIL(target_units*0.92),
  completed_date=due_date-INTERVAL'40 days' WHERE id=19;

UPDATE leasing_plans SET status='in_progress',
  completed_area=CEIL(target_area*0.72), completed_units=CEIL(target_units*0.68) WHERE id=14;

UPDATE leasing_plans SET status='in_progress',
  completed_area=CEIL(target_area*0.85), completed_units=CEIL(target_units*0.82) WHERE id=18;

UPDATE leasing_plans SET status='in_progress',
  completed_area=CEIL(target_area*0.48), completed_units=CEIL(target_units*0.45) WHERE id=17;

UPDATE leasing_plans SET status='in_progress',
  completed_area=CEIL(target_area*0.42), completed_units=CEIL(target_units*0.38) where id=20;

UPDATE leasing_plans SET status='completed',
  completed_area=CEIL(target_area*0.70), completed_units=CEIL(target_units*0.65),
  completed_date=due_date+INTERVAL'5 days' WHERE id=16;

-- ============================================================
-- 4. 续约结构优化：让新签/续签比例更均衡(~60/40)
-- ============================================================
UPDATE contracts SET is_renewal = FALSE WHERE is_renewal = TRUE;

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
      AND (c.lease_end - c.lease_start) > INTERVAL '2 years'
      AND c.is_renewal = FALSE
    ORDER BY c.monthly_rent DESC
    LIMIT 25
  ) sub WHERE contracts.id = sub.id;
END $$;

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

-- ============================================================
-- 5. 品牌能级趋势修复
-- ============================================================
DO $$
BEGIN
  UPDATE tenants SET created_at = NOW()-INTERVAL'2 months'
  FROM (SELECT id FROM tenants WHERE brand_tier='S' AND id NOT IN (SELECT DISTINCT tenant_ref_id FROM contracts WHERE status='ACTIVE') ORDER BY RANDOM() LIMIT 2) t
  WHERE tenants.id=t.id;

  UPDATE tenants SET created_at = NOW()-INTERVAL'1 month'
  FROM (SELECT id FROM tenants WHERE brand_tier='A' AND id NOT IN (SELECT DISTINCT tenant_ref_id FROM contracts WHERE status='ACTIVE') ORDER BY RANDOM() LIMIT 8) t
  WHERE tenants.id=t.id;

  UPDATE tenants SET created_at = NOW()-INTERVAL'20 days'
  FROM (SELECT id FROM tenants WHERE brand_tier='B' AND id NOT IN (SELECT DISTINCT tenant_ref_id FROM contracts WHERE status='ACTIVE') ORDER BY RANDOM() LIMIT 10) t
  WHERE tenants.id=t.id;

  UPDATE tenants SET created_at = NOW()-INTERVAL'10 days'
  FROM (SELECT id FROM tenants WHERE brand_tier='C' AND id NOT IN (SELECT DISTINCT tenant_ref_id FROM contracts WHERE status='ACTIVE') ORDER BY RANDOM() LIMIT 5) t
  WHERE tenants.id=t.id;
END $$;

-- ============================================================
-- 6. 经营数据月环比优化（使用正确的列名 tenant_id_ref）
-- ============================================================
UPDATE mock_business_data SET
  daily_traffic = ROUND(daily_traffic*0.75::numeric,0),
  daily_sales = ROUND(daily_sales*0.70::numeric,0),
  monthly_sales = ROUND(daily_sales*22::numeric,0),
  sales_per_sqm = ROUND(monthly_sales/NULLIF(
    (SELECT gross_area FROM units WHERE id=mock_business_data.unit_id LIMIT 1),1)::numeric,2),
  rent_to_sales_ratio = ROUND(
    (SELECT monthly_rent FROM contracts c JOIN units u ON u.id=c.unit_id
     WHERE c.tenant_id=mock_business_data.tenant_id_ref AND c.status='ACTIVE' LIMIT 1)
    /NULLIF(monthly_sales,0)*100::numeric,2)
WHERE data_date>='2026-03-01' AND data_date<'2026-04-01';

UPDATE mock_business_data SET
  daily_traffic = ROUND(daily_traffic*0.60::numeric,0),
  daily_sales = ROUND(daily_sales*0.55::numeric,0),
  monthly_sales = ROUND(daily_sales*18::numeric,0)
WHERE data_date>='2026-03-01' AND data_date<'2026-03-10';

UPDATE mock_business_data SET
  daily_traffic = ROUND(daily_traffic*1.20::numeric,0),
  daily_sales = ROUND(daily_sales*1.18::numeric,0),
  monthly_sales = ROUND(daily_sales*32::numeric,0),
  sales_per_sqm = ROUND(monthly_sales/NULLIF(
    (SELECT gross_area FROM units WHERE id=mock_business_data.unit_id LIMIT 1),1)::numeric,2),
  rent_to_sales_ratio = ROUND(
    (SELECT monthly_rent FROM contracts c JOIN units u ON u.id=c.unit_id
     WHERE c.tenant_id=mock_business_data.tenant_id_ref AND c.status='ACTIVE' LIMIT 1)
    /NULLIF(monthly_sales,0)*100::numeric,2)
WHERE data_date>='2026-04-01';

UPDATE mock_business_data SET
  daily_traffic = ROUND(daily_traffic*1.35::numeric,0),
  daily_sales = ROUND(daily_sales*1.30::numeric,0),
  sales_per_sqm = ROUND(sales_per_sqm*1.08::numeric,2)
WHERE data_date>='2026-04-15';

-- ============================================================
-- 7. 验证输出
-- ============================================================
SELECT '===== CAMP驾驶舱 KPI 深度增强验证(v5) =====' AS title;

SELECT '--- 核心经营指标 ---' AS s;
SELECT
  ROUND(COUNT(CASE WHEN status='OCCUPIED' THEN 1 END)::numeric/COUNT(*)*100,1)||'%' AS 出租率,
  ROUND(SUM(CASE WHEN status='VACANT' THEN gross_area ELSE 0 END)::numeric/10000,1)||'万m²' AS 空置面积,
  ROUND((SELECT COALESCE(SUM(monthly_rent),0)::numeric FROM contracts WHERE status='ACTIVE')/10000,1)||'万' AS 月租金,
  (SELECT COUNT(*) FROM contracts WHERE status='EXPIRING'
   AND lease_end<=CURRENT_DATE+INTERVAL'30 days' AND lease_end>=CURRENT_DATE) AS 即到合同
FROM units;

SELECT '--- 过程管控指标 ---' AS s;
SELECT
  (SELECT COUNT(*) FROM units u
   JOIN contracts c ON c.unit_id=u.id AND c.status='EXPIRING'
   WHERE u.status='VACANT' AND c.lease_end>=CURRENT_DATE-INTERVAL'30 days'
   AND c.lease_end<=CURRENT_DATE)::text AS 到期出空_个,
  (SELECT COUNT(*) FROM units WHERE status='VACANT' AND vacancy_days>=90)::text AS 预警空置_个,
  ROUND((SELECT COUNT(*) FROM leasing_plans WHERE status='completed'
    AND completed_date IS NOT NULL AND completed_date <= due_date-INTERVAL'30 days')::numeric/
    NULLIF((SELECT COUNT(*) FROM leasing_plans WHERE status NOT IN ('draft','cancelled')),0)*100,1)||'%' AS 提前30天完成率,
  ROUND((SELECT COUNT(*) FROM leasing_plans WHERE status='completed')::numeric/
    NULLIF((SELECT COUNT(*) FROM leasing_plans WHERE status NOT IN ('draft','cancelled')),0)*100,1)||'%' AS 总按时完成率;

SELECT '--- 签约结构 ---' AS s;
SELECT CASE WHEN is_renewal THEN '续签' ELSE '新签' END AS 类型,
  COUNT(*), ROUND(SUM(monthly_rent)::numeric,0) AS 月租金,
  ROUND(COUNT(*)*100.0/(SELECT COUNT(*) FROM contracts WHERE status IN ('ACTIVE','EXPIRING')),1)||'%' AS 占比
FROM contracts WHERE status IN ('ACTIVE','EXPIRING') GROUP BY is_renewal;

SELECT '--- 空置结构(4档) ---' AS s;
SELECT
  CASE
    WHEN vacancy_days < 90 THEN '短期<90天'
    WHEN vacancy_days < 181 THEN '中期90-180天'
    WHEN vacancy_days < 365 THEN '长期180-365天'
    ELSE '超长期>=365天'
  END AS 时长段,
  COUNT(*), ROUND(SUM(gross_area)::numeric,0) AS 面积_m²
FROM units WHERE status='VACANT'
GROUP BY
  CASE
    WHEN vacancy_days < 90 THEN 1
    WHEN vacancy_days < 181 THEN 2
    WHEN vacancy_days < 365 THEN 3
    ELSE 4
  END
ORDER BY MIN(vacancy_days);

SELECT '--- 品牌能级趋势 ---' AS s;
SELECT brand_tier, COUNT(*) AS 总量,
  (SELECT COUNT(*) FROM tenants t2
   JOIN contracts c ON c.tenant_id=t2.id AND c.status='ACTIVE'
   WHERE t2.brand_tier=tenants.brand_tier
     AND c.created_at >= DATE_TRUNC('month', CURRENT_DATE)) AS 本月新增
FROM tenants GROUP BY brand_tier ORDER BY COUNT(*) DESC;

SELECT '--- 经营数据趋势(近7天) ---' AS s;
SELECT TO_CHAR(data_date,'YYYY-MM-DD') AS 日期,
  COUNT(*) AS 铺位数,
  ROUND(AVG(daily_traffic)::numeric,0) AS 日客流,
  ROUND(AVG(sales_per_sqm)::numeric,1) AS 均坪效,
  ROUND(AVG(rent_to_sales_ratio)::numeric,2) AS 租售比
FROM mock_business_data
WHERE data_date >= (CURRENT_DATE - INTERVAL '7 days')
GROUP BY data_date ORDER BY data_date DESC;

SELECT '--- 招商计划完成情况 ---' AS s;
SELECT name, target_area||'㎡' AS 目标, completed_area||'㎡' AS 已完成,
  ROUND(completed_area*100.0/NULLIF(target_area,0)::numeric,1)||'%' AS 进度,
  status,
  CASE WHEN completed_date IS NOT NULL AND completed_date<=due_date-INTERVAL'30 days' THEN '[OK]提前30天+'
       WHEN completed_date IS NOT NULL AND completed_date<=due_date THEN '[OK]按时'
       WHEN due_date<CURRENT_DATE THEN '[WARN]逾期'
       ELSE '> 进行中' END AS 评价
FROM leasing_plans ORDER BY due_date LIMIT 10;
