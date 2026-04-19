-- =============================================
-- Part 2: Link tenants to units + Create contracts
-- =============================================

-- Link new tenants to occupied units
UPDATE units SET tenant_id = 't-1001' WHERE code = 'A-106';
UPDATE units SET tenant_id = 't-1002' WHERE code = 'A-107';
UPDATE units SET tenant_id = 't-1004' WHERE code = 'K-002';
UPDATE units SET tenant_id = 't-1005' WHERE code = 'K-003';
UPDATE units SET tenant_id = 't-1010' WHERE code = 'B-203';
UPDATE units SET tenant_id = 't-1011' WHERE code = 'B-204';
UPDATE units SET tenant_id = 't-1007' WHERE code = 'B-206';
UPDATE units SET tenant_id = 't-1006' WHERE code = 'C-305';
UPDATE units SET tenant_id = 't-1013' WHERE code = 'C-306';
UPDATE units SET tenant_id = 't-1008' WHERE code = 'C-308';
UPDATE units SET tenant_id = 't-1003' WHERE code = 'D-401';
UPDATE units SET tenant_id = 't-1014' WHERE code = 'D-402';
UPDATE units SET tenant_id = 't-1015' WHERE code = 'D-403';
UPDATE units SET tenant_id = 't-1012' WHERE code = 'D-404';
UPDATE units SET tenant_id = 't-1009' WHERE code = 'D-405';
UPDATE units SET tenant_id = 't-1010' WHERE code = 'K-401';
UPDATE units SET tenant_id = 't-1006' WHERE code = 'E-501';
UPDATE units SET tenant_id = 't-1007' WHERE code = 'E-502';
UPDATE units SET tenant_id = 't-1004' WHERE code = 'E-503';
UPDATE units SET tenant_id = 't-1005' WHERE code = 'E-504';

-- Also link existing units that don't have tenants yet
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 1) WHERE code = 'A-101';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 2) WHERE code = 'A-102';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 3) WHERE code = 'A-103';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 5) WHERE code = 'K-001';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 6) WHERE code = 'B-201';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 7) WHERE code = 'B-202';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 9) WHERE code = 'B-205';
UPDATE units SET tenant_id = (SELECT tenant_id FROM tenants WHERE id = 10) WHERE code = 'C-301';

-- =============================================
-- Part 3: Create contracts for new unit-tenant pairs
-- =============================================

INSERT INTO contracts (contract_number, unit_id, tenant_ref_id, status, lease_start, lease_end, monthly_rent, management_fee, deposit, currency, payment_frequency, signed_area, ai_imported, ai_confidence_score, created_at, updated_at) VALUES
-- F1 new units
('CT-2024-A106-LV', (SELECT id FROM units WHERE code='A-106'), (SELECT id FROM tenants WHERE name='Louis Vuitton China'), 'ACTIVE', '2024-06-01', '2027-05-31', 28500.00, 2850.00, 85500.00, 'CNY', 'MONTHLY', 85, false, 0.95, now(), now()),
('CT-2024-A107-Gucci', (SELECT id FROM units WHERE code='A-107'), (SELECT id FROM tenants WHERE name='Gucci China Trading'), 'ACTIVE', '2024-07-01', '2027-06-30', 26400.00, 2640.00, 79200.00, 'CNY', 'MONTHLY', 78, false, 0.95, now(), now()),
('CT-2024-K002-MUJI', (SELECT id FROM units WHERE code='K-002'), (SELECT id FROM tenants WHERE name='MUJI (China)'), 'ACTIVE', '2024-08-01', '2027-07-31', 3600.00, 360.00, 10800.00, 'CNY', 'MONTHLY', 10, false, 0.92, now(), now()),
('CT-2024-K003-COS', (SELECT id FROM units WHERE code='K-003'), (SELECT id FROM tenants WHERE name='COS China'), 'ACTIVE', '2024-09-01', '2027-08-31', 5400.00, 540.00, 16200.00, 'CNY', 'MONTHLY', 16, false, 0.90, now(), now()),

-- F2 new units
('CT-2024-B203-PopMart', (SELECT id FROM units WHERE code='B-203'), (SELECT id FROM tenants WHERE name='Pop Mart (China)'), 'ACTIVE', '2024-03-01', '2027-02-28', 42000.00, 4200.00, 126000.00, 'CNY', 'MONTHLY', 126, false, 0.93, now(), now()),
('CT-2024-B204-Miniso', (SELECT id FROM units WHERE code='B-204'), (SELECT id FROM tenants WHERE name='名创优品 Pro'), 'ACTIVE', '2024-04-01', '2027-03-31', 39000.00, 3900.00, 117000.00, 'CNY', 'MONTHLY', 117, false, 0.91, now(), now()),
('CT-2024-B206-HDL', (SELECT id FROM units WHERE code='B-206'), (SELECT id FROM tenants WHERE name='Haidilao Catering'), 'ACTIVE', '2024-05-01', '2027-04-30', 60000.00, 6000.00, 180000.00, 'CNY', 'MONTHLY', 180, false, 0.94, now(), now()),

-- F3 new units
('CT-2024-C305-IKEA', (SELECT id FROM units WHERE code='C-305'), (SELECT id FROM tenants WHERE name='IKEA China'), 'ACTIVE', '2024-01-15', '2027-01-14', 135000.00, 13500.00, 405000.00, 'CNY', 'MONTHLY', 405, false, 0.96, now(), now()),
('CT-2024-C306-CTF', (SELECT id FROM units WHERE code='C-306'), (SELECT id FROM tenants WHERE name='周大福珠宝 CTF'), 'ACTIVE', '2024-02-15', '2027-02-14', 49500.00, 4950.00, 148500.00, 'CNY', 'MONTHLY', 149, false, 0.93, now(), now()),
('CT-2024-C308-PHZ', (SELECT id FROM units WHERE code='C-308'), (SELECT id FROM tenants WHERE name='Pizza Hut China'), 'EXPIRING', '2023-06-01', '2026-05-31', 55000.00, 5500.00, 165000.00, 'CNY', 'MONTHLY', 198, false, 0.90, now(), now()),

-- F4 new units
('CT-2024-D401-Hermes', (SELECT id FROM units WHERE code='D-401'), (SELECT id FROM tenants WHERE name='Hermes (China)'), 'ACTIVE', '2024-03-15', '2027-03-14', 150000.00, 15000.00, 450000.00, 'CNY', 'MONTHLY', 450, false, 0.97, now(), now()),
('CT-2024-D402-Sephora', (SELECT id FROM units WHERE code='D-402'), (SELECT id FROM tenants WHERE name='丝芙兰 Sephora Pro'), 'ACTIVE', '2024-04-15', '2027-04-14', 54000.00, 5400.00, 162000.00, 'CNY', 'MONTHLY', 162, false, 0.94, now(), now()),
('CT-2024-D403-UniqloP', (SELECT id FROM units WHERE code='D-403'), (SELECT id FROM tenants WHERE name='优衣库 Uniqlo Plus'), 'ACTIVE', '2024-05-15', '2027-05-14', 46500.00, 4650.00, 139500.00, 'CNY', 'MONTHLY', 140, false, 0.93, now(), now()),
('CT-2024-D404-Watsons', (SELECT id FROM units WHERE code='D-404'), (SELECT id FROM tenants WHERE name='屈臣氏 Watsons'), 'ACTIVE', '2024-06-15', '2027-06-14', 40500.00, 4050.00, 121500.00, 'CNY', 'MONTHLY', 122, false, 0.91, now(), now()),
('CT-2024-D405-KFC', (SELECT id FROM units WHERE code='D-405'), (SELECT id FROM tenants WHERE name='KFC China'), 'ACTIVE', '2024-07-15', '2027-07-14', 75000.00, 7500.00, 225000.00, 'CNY', 'MONTHLY', 225, false, 0.92, now(), now()),
('CT-2024-K401-PopM2', (SELECT id FROM units WHERE code='K-401'), (SELECT id FROM tenants WHERE name='Pop Mart (China)'), 'ACTIVE', '2024-08-15', '2027-08-14', 4500.00, 450.00, 13500.00, 'CNY', 'MONTHLY', 13, false, 0.90, now(), now()),

-- F5 new units
('CT-2024-E501-Cinema', (SELECT id FROM units WHERE code='E-501'), (SELECT id FROM tenants WHERE name='IKEA China'), 'ACTIVE', '2024-01-01', '2028-12-31', 240000.00, 24000.00, 720000.00, 'CNY', 'MONTHLY', 720, false, 0.96, now(), now()),
('CT-2024-E502-Gym', (SELECT id FROM units WHERE code='E-502'), (SELECT id FROM tenants WHERE name='Haidilao Catering'), 'ACTIVE', '2024-02-01', '2028-01-31', 180000.00, 18000.00, 540000.00, 'CNY', 'MONTHLY', 540, false, 0.94, now(), now()),
('CT-2024-E503-Edu', (SELECT id FROM units WHERE code='E-503'), (SELECT id FROM tenants WHERE name='MUJI (China)'), 'ACTIVE', '2024-03-01', '2027-02-28', 60000.00, 6000.00, 180000.00, 'CNY', 'MONTHLY', 180, false, 0.91, now(), now()),
('CT-2024-E504-Family', (SELECT id FROM units WHERE code='E-504'), (SELECT id FROM tenants WHERE name='COS China'), 'ACTIVE', '2024-04-01', '2027-03-31', 51000.00, 5100.00, 153000.00, 'CNY', 'MONTHLY', 153, false, 0.92, now(), now()),

-- Some EXPIRING contracts (ending within 30-60 days)
('CT-EXP-A101-Zara', (SELECT id FROM units WHERE code='A-101'), (SELECT id FROM tenants WHERE name='Zara China Retail Co., Ltd.'), 'EXPIRING', '2023-04-01', '2026-05-15', 30600.00, 3060.00, 91800.00, 'CNY', 'MONTHLY', 120, false, 0.93, now(), now()),
('CT-EXP-B201-Adidas', (SELECT id FROM units WHERE code='B-201'), (SELECT id FROM tenants WHERE name='Adidas China China Ltd.'), 'EXPIRING', '2023-05-01', '2026-05-20', 45900.00, 4590.00, 137700.00, 'CNY', 'MONTHLY', 180, false, 0.90, now(), now()),
('CT-EXP-C301-Samsung', (SELECT id FROM units WHERE code='C-301'), (SELECT id FROM tenants WHERE name='Samsung Electronics China'), 'EXPIRING', '2023-09-01', '2026-05-10', 76500.00, 7650.00, 229500.00, 'CNY', 'MONTHLY', 300, false, 0.95, now(), now()),

-- One EXPIRED contract for testing
('CT-EXP-A105-old', (SELECT id FROM units WHERE code='A-105'), (SELECT id FROM tenants WHERE name='Miniso (China) Co., Ltd.'), 'EXPIRED', '2022-01-01', '2025-01-01', 15000.00, 1500.00, 45000.00, 'CNY', 'MONTHLY', 60, false, 0.88, now(), now());

-- =============================================
-- Part 4: Update existing contracts to fix broken ones
-- =============================================

-- Fix contract 4 which has no unit_id (A-104 doesn't exist)
DELETE FROM contracts WHERE id = 4;

-- Clean up duplicate draft contracts for B-201
DELETE FROM contracts WHERE id IN (12, 13, 14);

-- Delete orphaned contract for NEW-LBCT (was a test artifact)
DELETE FROM contracts WHERE id = 16;

-- =============================================
-- Part 5: Add more leasing plans
-- =============================================

INSERT INTO leasing_plans (mall_id, name, plan_type, description, target_area, target_units, completed_area, completed_units, status, owner, start_date, due_date) VALUES
(1, 'Q2品牌升级计划', 'BRAND_UPGRADE', '引入S级和A级品牌，提升商场整体定位', 800.0, 5, 350.0, 2, 'IN_PROGRESS', '招商经理 张三', '2026-04-01', '2026-06-30'),
(1, 'F4楼层招商计划', 'FLOOR_LEASING', 'F4楼层全面招商，目标出租率85%', 1200.0, 8, 1020.0, 6, 'IN_PROGRESS', '招商经理 李四', '2026-03-01', '2026-07-31'),
(1, 'F5主力店落地计划', 'ANCHOR_LEASING', '完成影院、健身等主力店签约', 1500.0, 3, 1420.0, 2, 'NEAR_COMPLETE', '招商总监 王五', '2026-01-01', '2026-05-31'),
(1, '空置铺位去化专项行动', 'VACANCY_REDUCTION', '集中处理长期空置铺位（>90天）', 900.0, 7, 380.0, 3, 'IN_PROGRESS', '招商经理 赵六', '2026-04-15', '2026-08-31'),
(1, '联发品牌引入计划', 'LIANFA_INTRO', '引入更多联发合作品牌，提升联发占比至25%', 500.0, 4, 120.0, 1, 'PLANNING', '招商总监 李四', '2026-06-01', '2026-09-30');
