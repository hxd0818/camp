-- KPI增强 v9：修复品牌趋势MoM和签约结构
-- 目标：让本月有合理的新签约数，上月有基线，MoM显示合理增长（20-50%）
-- 执行：docker exec -i camp-postgres psql -U cdata -d cdata < scripts/enhance-kpi-v9.sql

-- ============================================================
-- 1. 重置合同created_at：分层设置
--    本月(4月): ~15个合同 → 新签主力
--    上月(3月): ~25个合同 → 基线
--    更早: 其余合同 → 历史数据
-- ============================================================
DO $$
BEGIN
  -- 本月新签：选15个非续签活跃合同，created_at设在本月
  UPDATE contracts SET created_at = NOW() - INTERVAL '5 days'
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE' AND is_renewal=FALSE
    ORDER BY monthly_rent DESC LIMIT 15) t
  WHERE contracts.id = t.id;

  -- 本月续签：选5个续签合同，created_at设在本月中旬
  UPDATE contracts SET created_at = NOW() - INTERVAL '12 days'
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE' AND is_renewal=TRUE
    ORDER BY monthly_rent DESC LIMIT 5) t
  WHERE contracts.id = t.id;

  -- 上月基线：约25个合同设到上月
  UPDATE contracts SET created_at = NOW() - INTERVAL '33 days'
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE'
      AND id NOT IN (
        SELECT id FROM contracts
        WHERE status='ACTIVE' AND created_at >= CURRENT_DATE - INTERVAL '20 days'
      )
    ORDER BY RANDOM() LIMIT 25) t
  WHERE contracts.id = t.id;

  -- 更早历史：剩余活跃合同设到40-80天前
  UPDATE contracts SET created_at = NOW() - (FLOOR(RANDOM()*40+40)||' days')::interval
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE'
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ORDER BY RANDOM() LIMIT 20) t
  WHERE contracts.id = t.id;
END $$;

-- 验证
SELECT '--- 合同created_at分布 ---' AS s;
SELECT
  CASE
    WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN '本月'
    WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
     AND created_at < DATE_TRUNC('month', CURRENT_DATE) THEN '上月'
    ELSE '更早'
  END AS 时段,
  COUNT(*) AS 合同数,
  COUNT(*) FILTER (WHERE is_renewal=TRUE) AS 续签数,
  COUNT(*) FILTER (WHERE is_renewal=FALSE OR is_renewal IS NULL) AS 新签数
FROM contracts WHERE status='ACTIVE'
GROUP BY
  CASE
    WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1
    WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
     AND created_at < DATE_TRUNC('month', CURRENT_DATE) THEN 2
    ELSE 3
  END
ORDER BY 1;

-- ============================================================
-- 2. 同步调整tenants.created_at保持一致
-- （某些查询可能用tenant.created_at）
-- ============================================================
DO $$
BEGIN
  UPDATE tenants SET created_at = NOW() - INTERVAL '10 days'
  FROM (SELECT DISTINCT tenant_ref_id FROM contracts
    WHERE status='ACTIVE' AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    LIMIT 15) t
  WHERE tenants.id = t.tenant_ref_id;

  UPDATE tenants SET created_at = NOW() - INTERVAL '40 days'
  FROM (SELECT DISTINCT tenant_ref_id FROM contracts
    WHERE status='ACTIVE'
      AND created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
      AND created_at < DATE_TRUNC('month', CURRENT_DATE)
    LIMIT 20) t
  WHERE tenants.id = t.tenant_ref_id;
END $$;

SELECT '--- 最终验证 ---' AS s;
SELECT '核心指标:' AS 类别,
  ROUND(COUNT(CASE WHEN status='OCCUPIED' THEN 1 END)::numeric/COUNT(*)*100,1)||'%' AS 出租率,
  (SELECT COUNT(*) FROM units WHERE status='VACANT' AND vacancy_days>=90)||'个预警',
  (SELECT COUNT(*) FROM contracts c JOIN units u ON u.id=c.unit_id
   WHERE c.status='EXPIRED' AND u.status='VACANT'
   AND c.lease_end >= CURRENT_DATE-INTERVAL'30 days')||'个到期出空'
FROM units;
