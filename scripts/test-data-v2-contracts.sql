-- =============================================
-- Part 4: 关联新铺位+租户 + 创建合同
-- =============================================

-- Link F1 new units
UPDATE units SET tenant_id = 't-2001' WHERE code = 'A-110';  -- 香奈儿
UPDATE units SET tenant_id = 't-2002' WHERE code = 'A-111';  -- 迪奥
UPDATE units SET tenant_id = 't-2018' WHERE code = 'K-005';  -- 喜茶
UPDATE units SET tenant_id = 't-2019' WHERE code = 'K-006';  -- 奈雪

-- Link F2 new units
UPDATE units SET tenant_id = 't-2010' WHERE code = 'B-207';  -- 波司登
UPDATE units SET tenant_id = 't-2011' WHERE code = 'B-208';  -- 李宁
UPDATE units SET tenant_id = 't-2041' WHERE code = 'B-209';  -- 真功夫
UPDATE units SET tenant_id = 't-2042' WHERE code = 'NEW-8ZQC' placeholder; -- won't match, fix below

-- Link F3 new units
UPDATE units SET tenant_id = 't-2026' WHERE code = 'C-310';  -- 山姆会员店
UPDATE units SET tenant_id = 't-2027' WHERE code = 'C-311';  -- 盒马鲜生
UPDATE units SET tenant_id = 't-2061' WHERE code = 'C-312';  -- 麦当劳
UPDATE units SET tenant_id = 't-2053' WHERE code = 'C-313';  -- 巴拉巴拉
UPDATE units SET tenant_id = 't-2017' WHERE code = 'K-301';  -- 全棉时代
UPDATE units SET tenant_id = 't-2022' WHERE code = 'K-302';  -- 调色师

-- Link F4 new units
UPDATE units SET tenant_id = 't-2026' WHERE code = 'D-409';  -- 山姆会员店(二店)
UPDATE units SET tenant_id = 't-2028' WHERE code = 'D-410';  -- 西西弗书店
UPDATE units SET tenant_id = 't-2024' WHERE code = 'D-411';  -- 华为体验店
UPDATE units SET tenant_id = 't-2023' WHERE code = 'D-412';  -- 完美日记
UPDATE units SET tenant_id = 't-2012' WHERE code = 'D-413';  -- 安踏体育
UPDATE units SET tenant_id = 't-2054' WHERE code = 'D-414';  -- 安奈儿童装
UPDATE units SET tenant_id = 't-2044' WHERE code = 'D-415';  -- CoCo都可
UPDATE units SET tenant_id = 't-2020' WHERE code = 'K-403';  -- 瑞幸咖啡
UPDATE units SET tenant_id = 't-2045' WHERE code = 'K-404';  -- 书亦烧仙草

-- Link F5 new units
UPDATE units SET tenant_id = 't-2030' WHERE code = 'E-507';  -- 威尔士健身(亲子乐园区)
UPDATE units SET tenant_id = 't-2029' WHERE code = 'E-508';  -- CGV影城(教育)
UPDATE units SET tenant_id = 't-2049' WHERE code = 'E-509';  -- 眼镜88
UPDATE units SET tenant_id = 't-2045' WHERE code = 'E-510';  -- 书亦烧仙草
UPDATE units SET tenant_id = 't-2065' WHERE code = 'E-511';  -- 绝味鸭脖

-- =============================================
-- Part 5: 为新关联创建合同 (24份新合同)
-- =============================================
INSERT INTO contracts (contract_number, unit_id, tenant_ref_id, status, lease_start, lease_end, monthly_rent, management_fee, deposit, currency, payment_frequency, signed_area, ai_imported, ai_confidence_score, created_at, updated_at) VALUES
-- F1 新合同
('CT-25-A110-Chanel', (SELECT id FROM units WHERE code='A-110'), (SELECT id FROM tenants WHERE name='香奈儿 Chanel'), 'ACTIVE', '2024-09-01', '2027-08-31', 39000.00, 3900.00, 117000.00, 'CNY', 'MONTHLY', 117, false, 0.97, now(), now()),
('CT-25-A111-Dior', (SELECT id FROM units WHERE code='A-111'), (SELECT id FROM tenants WHERE name='迪奥 Dior'), 'ACTIVE', '2024-10-01', '2027-09-30', 30000.00, 3000.00, 90000.00, 'CNY', 'MONTHLY', 90, false, 0.96, now(), now()),
('CT-25-K005-Heytea', (SELECT id FROM units WHERE code='K-005'), (SELECT id FROM tenants WHERE name='喜茶 HEYTEA'), 'ACTIVE', '2025-01-15', '2028-01-14', 7200.00, 720.00, 21600.00, 'CNY', 'MONTHLY', 18, false, 0.92, now(), now()),
('CT-25-K006-Nayuki', (SELECT id FROM units WHERE code='K-006'), (SELECT id FROM tenants WHERE name='奈雪的茶'), 'ACTIVE', '2025-02-01', '2028-01-31', 5040.00, 504.00, 15120.00, 'CNY', 'MONTHLY', 12, false, 0.91, now(), now()),

-- F2 新合同
('CT-25-B207-Bosideng', (SELECT id FROM units WHERE code='B-207'), (SELECT id FROM tenants WHERE name='波司登羽绒服'), 'ACTIVE', '2024-11-01', '2027-10-31', 36000.00, 3600.00, 108000.00, 'CNY', 'MONTHLY', 108, false, 0.93, now(), now()),
('CT-25-B208-Lining', (SELECT id FROM units WHERE code='B-208'), (SELECT id FROM tenants WHERE name='李宁体育'), 'ACTIVE', '2024-12-01', '2027-11-30', 28500.00, 2850.00, 85500.00, 'CNY', 'MONTHLY', 86, false, 0.91, now(), now()),
('CT-25-B209-Zhenkungfu', (SELECT id FROM units WHERE code='B-209'), (SELECT id FROM tenants WHERE name='真功夫快餐'), 'ACTIVE', '2025-01-01', '2028-12-31', 48000.00, 4800.00, 144000.00, 'CNY', 'MONTHLY', 144, false, 0.90, now(), now()),

-- F3 新合同
('CT-25-C310-SamClub', (SELECT id FROM units WHERE code='C-310'), (SELECT id FROM tenants WHERE name='山姆会员店'), 'ACTIVE', '2024-06-15', '2027-06-14', 114000.00, 11400.00, 342000.00, 'CNY', 'MONTHLY', 342, false, 0.97, now(), now()),
('CT-25-C311-Hema', (SELECT id FROM units WHERE code='C-311'), (SELECT id FROM tenants WHERE name='盒马鲜生'), 'ACTIVE', '2024-07-15', '2027-07-14', 43500.00, 4350.00, 130500.00, 'CNY', 'MONTHLY', 131, false, 0.94, now(), now()),
('CT-25-C312-Mcd', (SELECT id FROM units WHERE code='C-312'), (SELECT id FROM tenants WHERE name='麦当劳 McDonalds'), 'ACTIVE', '2024-08-15', '2027-08-14', 54000.00, 5400.00, 162000.00, 'CNY', 'MONTHLY', 162, false, 0.93, now(), now()),
('CT-25-C313-Balabala', (SELECT id FROM units WHERE code='C-313'), (SELECT id FROM tenants WHERE name='巴拉巴拉童装'), 'ACTIVE', '2024-09-15', '2027-09-14', 60000.00, 6000.00, 180000.00, 'CNY', 'MONTHLY', 180, false, 0.91, now(), now()),
('CT-25-K301-Purcotton', (SELECT id FROM units WHERE code='K-301'), (SELECT id FROM tenants WHERE name='全棉时代'), 'ACTIVE', '2025-03-01', '2028-02-28', 5400.00, 540.00, 16200.00, 'CNY', 'MONTHLY', 14, false, 0.90, now(), now()),
('CT-25-K302-Colorist', (SELECT id FROM units WHERE code='K-302'), (SELECT id FROM tenants WHERE name='调色师 THE COLORIST'), 'ACTIVE', '2025-04-01', '2028-03-31', 7700.00, 770.00, 23100.00, 'CNY', 'MONTHLY', 20, false, 0.92, now(), now()),

-- F4 新合同
('CT-25-D409-SamClub2', (SELECT id FROM units WHERE code='D-409'), (SELECT id FROM tenants WHERE name='山姆会员店'), 'ACTIVE', '2024-04-01', '2027-03-31', 126000.00, 12600.00, 378000.00, 'CNY', 'MONTHLY', 378, false, 0.96, now(), now()),
('CT-25-D410-Sisyphe', (SELECT id FROM units WHERE code='D-410'), (SELECT id FROM tenants WHERE name='西西弗书店'), 'ACTIVE', '2024-05-01', '2027-04-30', 43200.00, 4320.00, 129600.00, 'CNY', 'MONTHLY', 144, false, 0.91, now(), now()),
('CT-25-D411-Huawei', (SELECT id FROM units WHERE code='D-411'), (SELECT id FROM tenants WHERE name='华为体验店'), 'ACTIVE', '2024-06-01', '2027-05-31', 42000.00, 4200.00, 126000.00, 'CNY', 'MONTHLY', 126, false, 0.95, now(), now()),
('CT-25-D412-PerfectDiary', (SELECT id FROM units WHERE code='D-412'), (SELECT id FROM tenants WHERE name='完美日记'), 'ACTIVE', '2024-07-01', '2027-06-30', 37500.00, 3750.00, 112500.00, 'CNY', 'MONTHLY', 113, false, 0.93, now(), now()),
('CT-25-D413-Anta', (SELECT id FROM units WHERE code='D-413'), (SELECT id FROM tenants WHERE name='安踏体育'), 'ACTIVE', '2024-08-01', '2027-07-31', 51000.00, 5100.00, 153000.00, 'CNY', 'MONTHLY', 153, false, 0.92, now(), now()),
('CT-25-D414-Annil', (SELECT id FROM units WHERE code='D-414'), (SELECT id FROM tenants WHERE name='安奈儿童装'), 'ACTIVE', '2024-09-01', '2027-08-31', 40500.00, 4050.00, 121500.00, 'CNY', 'MONTHLY', 122, false, 0.90, now(), now()),
('CT-25-D415-CoCo', (SELECT id FROM units WHERE code='D-415'), (SELECT id FROM tenants WHERE name='CoCo都可茶饮'), 'EXPIRING', '2023-10-01', '2026-05-20', 57000.00, 5700.00, 171000.00, 'CNY', 'MONTHLY', 171, false, 0.89, now(), now()),
('CT-25-K403-Luckin', (SELECT id FROM units WHERE code='K-403'), (SELECT id FROM tenants WHERE name='瑞幸咖啡'), 'ACTIVE', '2025-02-01', '2028-01-31', 6300.00, 630.00, 18900.00, 'CNY', 'MONTHLY', 16, false, 0.91, now(), now()),
('CT-25-K404-Shuyi', (SELECT id FROM units WHERE code='K-404'), (SELECT id FROM tenants WHERE name='书亦烧仙草'), 'ACTIVE', '2025-03-01', '2028-02-28', 5200.00, 520.00, 15600.00, 'CNY', 'MONTHLY', 13, false, 0.89, now(), now()),

-- F5 新合同
('CT-25-E507-Willsg', (SELECT id FROM units WHERE code='E-507'), (SELECT id FROM tenants WHERE name='威尔士健身'), 'ACTIVE', '2024-03-01', '2027-02-28', 135000.00, 13500.00, 405000.00, 'CNY', 'MONTHLY', 405, false, 0.95, now(), now()),
('CT-25-E508-CGV', (SELECT id FROM units WHERE code='E-508'), (SELECT id FROM tenants WHERE name='CGV影城'), 'ACTIVE', '2024-04-01', '2028-03-31', 54000.00, 5400.00, 162000.00, 'CNY', 'MONTHLY', 162, false, 0.94, now(), now()),
('CT-25-E509-Glasses88', (SELECT id FROM units WHERE code='E-509'), (SELECT id FROM tenants WHERE name='眼镜88'), 'ACTIVE', '2024-05-01', '2027-04-30', 42000.00, 4200.00, 126000.00, 'CNY', 'MONTHLY', 126, false, 0.90, now(), now()),
('CT-25-E510-Shuyi2', (SELECT id FROM units WHERE code='E-510'), (SELECT id FROM tenants WHERE name='书亦烧仙草'), 'ACTIVE', '2024-06-01', '2027-05-31', 24000.00, 2400.00, 72000.00, 'CNY', 'MONTHLY', 72, false, 0.88, now(), now()),
('CT-25-E511-Juewei', (SELECT id FROM units WHERE code='E-511'), (SELECT id FROM tenants WHERE name='绝味鸭脖'), 'ACTIVE', '2024-07-01', '2027-06-30', 60000.00, 6000.00, 180000.00, 'CNY', 'MONTHLY', 180, false, 0.90, now(), now());

-- 补充更多即将到期合同（让TOP10更丰富）
INSERT INTO contracts (contract_number, unit_id, tenant_ref_id, status, lease_start, lease_end, monthly_rent, management_fee, deposit, currency, payment_frequency, signed_area, ai_imported, ai_confidence_score, created_at, updated_at) VALUES
('CT-EXP-K002-MUJI', (SELECT id FROM units WHERE code='K-002'), (SELECT id FROM tenants WHERE name='无印良品 MUJI'), 'EXPIRING', '2023-08-01', '2026-05-25', 3600.00, 360.00, 10800.00, 'CNY', 'MONTHLY', 10, false, 0.92, now(), now()),
('CT-EXP-B204-MinisoP', (SELECT id FROM units WHERE code='B-204'), (SELECT id FROM tenants WHERE name='名创优品旗舰'), 'EXPIRING', '2023-09-01', '2026-06-10', 39000.00, 3900.00, 117000.00, 'CNY', 'MONTHLY', 117, false, 0.91, now(), now()),
('CT-EXP-C306-CTF', (SELECT id FROM units WHERE code='C-306'), (SELECT id FROM tenants WHERE name='周大福珠宝'), 'EXPIRING', '2023-10-01', '2026-06-15', 49500.00, 4950.00, 148500.00, 'CNY', 'MONTHLY', 149, false, 0.93, now(), now()),
('CT-EXP-D402-SephoraPro', (SELECT id FROM units WHERE code='D-402'), (SELECT id FROM tenants WHERE name='丝芙兰旗舰店'), 'EXPIRING', '2023-11-01', '2026-06-20', 54000.00, 5400.00, 162000.00, 'CNY', 'MONTHLY', 162, false, 0.94, now(), now());
