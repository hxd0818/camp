-- =============================================
-- CAMP Test Data Generation Script
-- =============================================

-- 1. NEW TENANTS (15 new tenants with diverse brand tiers)
INSERT INTO tenants (tenant_id, name, type, contact_person, phone, email, industry, status, brand_tier, is_flagship, is_first_entry, created_at, updated_at) VALUES
  ('t-1001', 'Louis Vuitton China', 'COMPANY', '张明', '13800100101', 'lv@lvmh.com.cn', 'Luxury Fashion', 'ACTIVE', 'S', true, false, now(), now()),
  ('t-1002', 'Gucci China Trading', 'COMPANY', '李娜', '13800100102', 'gucci@kering.com.cn', 'Luxury Fashion', 'ACTIVE', 'S', true, false, now(), now()),
  ('t-1003', 'Hermes (China)', 'COMPANY', '王芳', '13800100103', 'hermes@hermes.com', 'Luxury Fashion', 'ACTIVE', 'S', true, false, now(), now()),
  ('t-1004', 'MUJI (China)', 'COMPANY', '陈伟', '13800100104', 'muji@ryohin.co.jp', 'Lifestyle Retail', 'ACTIVE', 'A', false, true, now(), now()),
  ('t-1005', 'COS China', 'COMPANY', '刘洋', '13800100105', 'cos@hm.com', 'Fashion Retail', 'ACTIVE', 'A', false, true, now(), now()),
  ('t-1006', 'IKEA China', 'COMPANY', '赵强', '13800100106', 'ikea@ikea.cn', 'Home Furnishing', 'ACTIVE', 'A', true, false, now(), now()),
  ('t-1007', 'Haidilao Catering', 'COMPANY', '孙丽', '13800100107', 'hdl@haidilao.com', 'F&B', 'ACTIVE', 'A', false, true, now(), now()),
  ('t-1008', 'Pizza Hut China', 'COMPANY', '周杰', '13800100108', 'ph@yumchina.com', 'F&B', 'ACTIVE', 'B', false, false, now(), now()),
  ('t-1009', 'KFC China', 'COMPANY', '吴敏', '13800100109', 'kfc@yumchina.com', 'F&B', 'ACTIVE', 'LIANFA', false, false, now(), now()),
  ('t-1010', 'Pop Mart (China)', 'COMPANY', '郑浩', '13800110110', 'popmart@popmart.com', 'Toys & Collectibles', 'ACTIVE', 'A', false, true, now(), now()),
  ('t-1011', '名创优品 Pro', 'COMPANY', '黄磊', '13800110111', 'minisopro@miniso.com.cn', 'Lifestyle Retail', 'ACTIVE', 'B', false, false, now(), now()),
  ('t-1012', '屈臣氏 Watsons', 'COMPANY', '林婷', '13800110112', 'watsons@a-sgroup.com', 'Personal Care', 'ACTIVE', 'B', false, false, now(), now()),
  ('t-1013', '周大福珠宝 CTF', 'COMPANY', '何勇', '13800110113', 'ctf@ctf.com.cn', 'Jewelry', 'ACTIVE', 'A', false, false, now(), now()),
  ('t-1014', '丝芙兰 Sephora Pro', 'COMPANY', '马超', '13800110114', 'sephora-pro@sephora.cn', 'Beauty', 'ACTIVE', 'A', true, false, now(), now()),
  ('t-1015', '优衣库 Uniqlo Plus', 'COMPANY', '罗静', '13800110115', 'uniqlo-plus@fastretailing.cn', 'Fashion Retail', 'ACTIVE', 'A', true, false, now(), now());

-- 2. NEW UNITS - F1
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('A-106', 'F1-A106精品区', 1, 'RETAIL', 'OCCUPIED', 95, 85, 'FIXED', NULL, now(), now()),
  ('A-107', 'F1-A107零售', 1, 'RETAIL', 'OCCUPIED', 88, 78, 'FIXED', NULL, now(), now()),
  ('A-108', 'F1-A108专柜', 1, 'RETAIL', 'VACANT', 72, 65, 'FIXED', 45, now(), now()),
  ('A-109', 'F1-A109店铺', 1, 'RETAIL', 'RESERVED', 110, 99, 'FIXED', NULL, now(), now()),
  ('K-002', 'F1-K002中岛', 1, 'KIOSK', 'OCCUPIED', 12, 10, 'FIXED', NULL, now(), now()),
  ('K-003', 'F1-K003中岛', 1, 'KIOSK', 'OCCUPIED', 18, 16, 'FIXED', NULL, now(), now()),
  ('K-004', 'F1-K004中岛', 1, 'KIOSK', 'VACANT', 10, 8, 'FIXED', 120, now(), now());

-- F2: Fill in gaps and add more
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('B-203', 'F2-B203店铺', 2, 'RETAIL', 'OCCUPIED', 140, 126, 'FIXED', NULL, now(), now()),
  ('B-204', 'F2-B204商铺', 2, 'RETAIL', 'OCCUPIED', 130, 117, 'FIXED', NULL, now(), now()),
  ('B-206', 'F2-B206餐饮', 2, 'FOOD_COURT', 'OCCUPIED', 200, 180, 'FIXED', NULL, now(), now()),
  ('NEW-5XMA', 'F2-NEW5XMA', 2, 'RETAIL', 'VACANT', 98, 88, 'FIXED', 200, now(), now()),
  ('NEW-7YFN', 'F2-NEW7YFN', 2, 'RETAIL', 'VACANT', 175, 158, 'FIXED', 90, now(), now());

-- F3: More units
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('C-305', 'F3-C305主力店', 3, 'ANCHOR', 'OCCUPIED', 450, 405, 'FIXED', NULL, now(), now()),
  ('C-306', 'F3-C306店铺', 3, 'RETAIL', 'OCCUPIED', 165, 149, 'FIXED', NULL, now(), now()),
  ('C-307', 'F3-C307零售', 3, 'RETAIL', 'VACANT', 120, 108, 'FIXED', 30, now(), now()),
  ('C-308', 'F3-C308餐饮', 3, 'FOOD_COURT', 'OCCUPIED', 220, 198, 'FIXED', NULL, now(), now()),
  ('C-309', 'F3-C309铺位', 3, 'RETAIL', 'VACANT', 85, 77, 'FIXED', 15, now(), now());

-- F4: New floor with many units
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('D-401', 'F4-D401主力店', 4, 'ANCHOR', 'OCCUPIED', 500, 450, 'FIXED', NULL, now(), now()),
  ('D-402', 'F4-D402店铺', 4, 'RETAIL', 'OCCUPIED', 180, 162, 'FIXED', NULL, now(), now()),
  ('D-403', 'F4-D403零售', 4, 'RETAIL', 'OCCUPIED', 155, 140, 'FIXED', NULL, now(), now()),
  ('D-404', 'F4-D404商铺', 4, 'RETAIL', 'OCCUPIED', 135, 122, 'FIXED', NULL, now(), now()),
  ('D-405', 'F4-D405餐饮', 4, 'FOOD_COURT', 'OCCUPIED', 250, 225, 'FIXED', NULL, now(), now()),
  ('D-406', 'F4-D406铺位', 4, 'RETAIL', 'VACANT', 100, 90, 'FIXED', 60, now(), now()),
  ('D-407', 'F4-D407空置', 4, 'RETAIL', 'VACANT', 115, 104, 'FIXED', 150, now(), now()),
  ('D-408', 'F4-D408预留', 4, 'RETAIL', 'RESERVED', 90, 81, 'FIXED', NULL, now(), now()),
  ('K-401', 'F4-K401中岛', 4, 'KIOSK', 'OCCUPIED', 15, 13, 'FIXED', NULL, now(), now()),
  ('K-402', 'F4-K402中岛', 4, 'KIOSK', 'VACANT', 12, 10, 'FIXED', 300, now(), now());

-- F5: New floor with mix of units
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('E-501', 'F5-E501影院', 5, 'ANCHOR', 'OCCUPIED', 800, 720, 'FIXED', NULL, now(), now()),
  ('E-502', 'F5-E502健身', 5, 'ANCHOR', 'OCCUPIED', 600, 540, 'FIXED', NULL, now(), now()),
  ('E-503', 'F5-E503教育', 5, 'RETAIL', 'OCCUPIED', 200, 180, 'FIXED', NULL, now(), now()),
  ('E-504', 'F5-E504亲子', 5, 'RETAIL', 'OCCUPIED', 170, 153, 'FIXED', NULL, now(), now()),
  ('E-505', 'F5-E505服务', 5, 'RETAIL', 'VACANT', 130, 117, 'FIXED', 400, now(), now()),
  ('E-506', 'F5-E506空置', 5, 'RETAIL', 'VACANT', 145, 131, 'FIXED', 180, now(), now());
