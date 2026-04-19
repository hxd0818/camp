-- =============================================
-- Part 3: 大幅扩充铺位 (新增40+铺位)
-- =============================================

-- F1 补充更多铺位
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('A-110', 'F1-A110精品', 1, 'RETAIL', 'OCCUPIED', 130, 117, 'FIXED', NULL, now(), now()),
  ('A-111', 'F1-A111零售', 1, 'RETAIL', 'OCCUPIED', 100, 90, 'FIXED', NULL, now(), now()),
  ('A-112', 'F1-A112店铺', 1, 'RETAIL', 'VACANT', 85, 77, 'FIXED', 25, now(), now()),
  ('K-005', 'F1-K005中岛', 1, 'KIOSK', 'OCCUPIED', 20, 18, 'FIXED', NULL, now(), now()),
  ('K-006', 'F1-K006中岛', 1, 'KIOSK', 'OCCUPIED', 14, 12, 'FIXED', NULL, now(), now());

-- F2 补充更多
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('B-207', 'F2-B207商铺', 2, 'RETAIL', 'OCCUPIED', 120, 108, 'FIXED', NULL, now(), now()),
  ('B-208', 'F2-B208零售', 2, 'RETAIL', 'OCCUPIED', 95, 86, 'FIXED', NULL, now(), now()),
  ('B-209', 'F2-B209餐饮', 2, 'FOOD_COURT', 'OCCUPIED', 160, 144, 'FIXED', NULL, now(), now()),
  ('B-210', 'F2-B210空置', 2, 'RETAIL', 'VACANT', 88, 79, 'FIXED', 75, now(), now()),
  ('NEW-8ZQC', 'F2-NEW8ZQC', 2, 'RETAIL', 'VACANT', 150, 135, 'FIXED', 350, now(), now()),
  ('NEW-9RDK', 'F2-NEW9RDK', 2, 'RETAIL', 'RESERVED', 120, 108, 'FIXED', NULL, now(), now());

-- F3 补充更多
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('C-310', 'F3-C310主力店', 3, 'ANCHOR', 'OCCUPIED', 380, 342, 'FIXED', NULL, now(), now()),
  ('C-311', 'F3-C311零售', 3, 'RETAIL', 'OCCUPIED', 145, 131, 'FIXED', NULL, now(), now()),
  ('C-312', 'F3-C312餐饮', 3, 'FOOD_COURT', 'OCCUPIED', 180, 162, 'FIXED', NULL, now(), now()),
  ('C-313', 'F3-C313儿童', 3, 'RETAIL', 'OCCUPIED', 200, 180, 'FIXED', NULL, now(), now()),
  ('C-314', 'F3-C314服务', 3, 'RETAIL', 'VACANT', 95, 86, 'FIXED', 55, now(), now()),
  ('C-315', 'F3-C315空置', 3, 'RETAIL', 'VACANT', 78, 70, 'FIXED', 110, now(), now()),
  ('K-301', 'F3-K301中岛', 3, 'KIOSK', 'OCCUPIED', 16, 14, 'FIXED', NULL, now(), now()),
  ('K-302', 'F3-K302中岛', 3, 'KIOSK', 'OCCUPIED', 22, 20, 'FIXED', NULL, now(), now()),
  ('K-303', 'F3-K303中岛', 3, 'KIOSK', 'VACANT', 10, 9, 'FIXED', 90, now(), now());

-- F4 补充更多
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('D-409', 'F4-D409超市', 4, 'ANCHOR', 'OCCUPIED', 420, 378, 'FIXED', NULL, now(), now()),
  ('D-410', 'F4-D410书店', 4, 'RETAIL', 'OCCUPIED', 160, 144, 'FIXED', NULL, now(), now()),
  ('D-411', 'F4-D411数码', 4, 'RETAIL', 'OCCUPIED', 140, 126, 'FIXED', NULL, now(), now()),
  ('D-412', 'F4-D412美妆', 4, 'RETAIL', 'OCCUPIED', 125, 113, 'FIXED', NULL, now(), now()),
  ('D-413', 'F4-D413运动', 4, 'RETAIL', 'OCCUPIED', 170, 153, 'FIXED', NULL, now(), now()),
  ('D-414', 'F4-D414童装', 4, 'RETAIL', 'OCCUPIED', 135, 122, 'FIXED', NULL, now(), now()),
  ('D-415', 'F4-D415餐饮', 4, 'FOOD_COURT', 'OCCUPIED', 190, 171, 'FIXED', NULL, now(), now()),
  ('D-416', 'F4-D416空置', 4, 'RETAIL', 'VACANT', 105, 95, 'FIXED', 40, now(), now()),
  ('D-417', 'F4-D417空置', 4, 'RETAIL', 'VACANT', 92, 83, 'FIXED', 180, now(), now()),
  ('K-403', 'F4-K403中岛', 4, 'KIOSK', 'OCCUPIED', 18, 16, 'FIXED', NULL, now(), now()),
  ('K-404', 'F4-K404中岛', 4, 'KIOSK', 'OCCUPIED', 15, 13, 'FIXED', NULL, now(), now()),
  ('K-405', 'F4-K405中岛', 4, 'KIOSK', 'VACANT', 11, 10, 'FIXED', 220, now(), now());

-- F5 补充更多
INSERT INTO units (code, name, floor_id, layout_type, status, gross_area, net_leasable_area, leasing_type, vacancy_days, created_at, updated_at) VALUES
  ('E-507', 'F5-E507亲子乐园', 5, 'ANCHOR', 'OCCUPIED', 450, 405, 'FIXED', NULL, now(), now()),
  ('E-508', 'F5-E508教育培训', 5, 'RETAIL', 'OCCUPIED', 180, 162, 'FIXED', NULL, now(), now()),
  ('E-509', 'F5-E509生活服务', 5, 'RETAIL', 'OCCUPIED', 140, 126, 'FIXED', NULL, now(), now()),
  ('E-510', 'F5-E510茶饮', 5, 'FOOD_COURT', 'OCCUPIED', 80, 72, 'FIXED', NULL, now(), now()),
  ('E-511', 'F5-E511小吃街', 5, 'FOOD_COURT', 'OCCUPIED', 200, 180, 'FIXED', NULL, now(), now()),
  ('E-512', 'F5-E512空置', 5, 'RETAIL', 'VACANT', 118, 106, 'FIXED', 65, now(), now()),
  ('E-513', 'F5-E513空置', 5, 'RETAIL', 'VACANT', 98, 88, 'FIXED', 280, now(), now());
