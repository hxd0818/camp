-- =============================================
-- CAMP Test Data V2: 全中文商户名 + 大幅扩容
-- =============================================

-- =============================================
-- Part 1: 现有租户全部改中文名
-- =============================================
UPDATE tenants SET name = 'Zara（莎拉）' WHERE id = 1;
UPDATE tenants SET name = 'H&M（海恩斯莫里斯）' WHERE id = 2;
UPDATE tenants SET name = '优衣库' WHERE id = 3;
UPDATE tenants SET name = '星巴克咖啡' WHERE id = 4;
UPDATE tenants SET name = '耐克运动' WHERE id = 5;
UPDATE tenants SET name = '阿迪达斯' WHERE id = 6;
UPDATE tenants SET name = '丝芙兰' WHERE id = 7;
UPDATE tenants SET name = '名创优品' WHERE id = 8;
UPDATE tenants SET name = '苹果零售' WHERE id = 9;
UPDATE tenants SET name = '三星电子' WHERE id = 10;
UPDATE tenants SET name = '星巴克臻选' WHERE id = 11;
UPDATE tenants SET name = '路易威登 LV' WHERE id = 12;
UPDATE tenants SET name = '古驰 Gucci' WHERE id = 13;
UPDATE tenants SET name = '爱马仕 Hermes' WHERE id = 14;
UPDATE tenants SET name = '无印良品 MUJI' WHERE id = 15;
UPDATE tenants SET name = 'COS' WHERE id = 16;
UPDATE tenants SET name = '宜家家居 IKEA' WHERE id = 17;
UPDATE tenants SET name = '海底捞火锅' WHERE id = 18;
UPDATE tenants SET name = '必胜客' WHERE id = 19;
UPDATE tenants SET name = '肯德基 KFC' WHERE id = 20;
UPDATE tenants SET name = '泡泡玛特' WHERE id = 21;
UPDATE tenants SET name = '名创优品旗舰' WHERE id = 22;
UPDATE tenants SET name = '屈臣氏' WHERE id = 23;
UPDATE tenants SET name = '周大福珠宝' WHERE id = 24;
UPDATE tenants SET name = '丝芙兰旗舰店' WHERE id = 25;
UPDATE tenants SET name = '优衣库旗舰店' WHERE id = 26;

-- =============================================
-- Part 2: 新增30+中文商户
-- =============================================
INSERT INTO tenants (tenant_id, name, type, contact_person, phone, email, industry, status, brand_tier, is_flagship, is_first_entry, created_at, updated_at) VALUES
-- S级 奢侈品/高端
('t-2001', '香奈儿 Chanel', 'COMPANY', '钱多多', '13900001001', 'chanel@chanel.cn', '奢侈品', 'ACTIVE', 'S', true, false, now(), now()),
('t-2002', '迪奥 Dior', 'COMPANY', '孙富贵', '13900001002', 'dior@dior.com.cn', '奢侈品', 'ACTIVE', 'S', true, false, now(), now()),
('t-2003', '普拉达 Prada', 'COMPANY', '李金贵', '13900001003', 'prada@prada.com', '奢侈品', 'ACTIVE', 'S', true, false, now(), now()),
('t-2004', '宝格丽 Bvlgari', 'COMPANY', '王珠宝', '13900001004', 'bvlgari@bvlgari.com', '珠宝腕表', 'ACTIVE', 'S', true, false, now(), now()),
('t-2005', '卡地亚 Cartier', 'COMPANY', '赵钻戒', '13900001005', 'cartier@cartier.com', '珠宝腕表', 'ACTIVE', 'S', true, false, now(), now()),

-- A级 主力品牌
('t-2010', '波司登羽绒服', 'COMPANY', '周保暖', '13900002010', 'bosideng@bosideng.com', '服装服饰', 'ACTIVE', 'A', false, true, now(), now()),
('t-2011', '李宁体育', 'COMPANY', '吴运动', '13900002011', 'lining@li-ning.com', '运动户外', 'ACTIVE', 'A', false, false, now(), now()),
('t-2012', '安踏体育', 'COMPANY', '郑跑步', '13900002012', 'anta@anta.com', '运动户外', 'ACTIVE', 'A', false, false, now(), now()),
('t-2013', '太平鸟时尚', 'COMPANY', '冯潮流', '13900002013', 'peacebird@peacebird.com', '服装服饰', 'ACTIVE', 'A', false, true, now(), now()),
('t-2014', '森马服饰', 'COMPANY', '褚休闲', '13900002014', 'semir@semir.com', '服装服饰', 'ACTIVE', 'A', false, false, now(), now()),
('t-2015', '拉夏贝尔', 'COMPANY', '卫女装', '13900002015', 'lachapelle@lachapelle.com', '服装服饰', 'ACTIVE', 'A', false, true, now(), now()),
('t-2016', '全棉时代', 'COMPANY', '蒋舒适', '13900002016', 'purcotton@purcotton.com', '母婴生活', 'ACTIVE', 'A', false, true, now(), now()),
('t-2017', '孩子王', 'COMPANY', '沈亲子', '13900002017', 'kidswant@kidswant.com', '母婴生活', 'ACTIVE', 'A', false, true, now(), now()),
('t-2018', '喜茶 HEYTEA', 'COMPANY', '韩茶饮', '13900002018', 'heytea@heytea.com', '餐饮美食', 'ACTIVE', 'A', false, true, now(), now()),
('t-2019', '奈雪的茶', 'COMPANY', '杨果茶', '13900002019', 'nayuki@nayuki.com', '餐饮美食', 'ACTIVE', 'A', false, true, now(), now()),
('t-2020', '瑞幸咖啡', 'COMPANY', '朱咖啡', '13900002020', 'luckin@luckincoffee.com', '餐饮美食', 'ACTIVE', 'A', false, true, now(), now()),
('t-2021', '乐高玩具 LEGO', 'COMPANY', '秦积木', '13900002021', 'lego@lego.com', '玩具娱乐', 'ACTIVE', 'A', false, true, now(), now()),
('t-2022', '调色师 THE COLORIST', 'COMPANY', '许美妆', '13900002022', 'colorist@thecolorist.com', '美妆集合', 'ACTIVE', 'A', false, true, now(), now()),
('t-2023', '完美日记', 'COMPANY', '何彩妆', '13900002023', 'perfectdiary@yatsen.com', '美妆护肤', 'ACTIVE', 'A', false, true, now(), now()),
('t-2024', '华为体验店', 'COMPANY', '吕数码', '13900002024', 'huawei@huawei.com', '3C数码', 'ACTIVE', 'A', true, false, now(), now()),
('t-2025', '小米之家', 'COMPANY', '施智能', '13900002025', 'mi@xiaomi.com', '3C数码', 'ACTIVE', 'A', true, false, now(), now()),
('t-2026', '山姆会员店', 'COMPANY', '张仓储', '13900002026', 'samclub@walmart.com', '超市卖场', 'ACTIVE', 'A', true, false, now(), now()),
('t-2027', '盒马鲜生', 'COMPANY', '曹生鲜', '13900002027', 'hema@alibaba.com', '超市卖场', 'ACTIVE', 'A', false, true, now(), now()),
('t-2028', '西西弗书店', 'COMPANY', '彭阅读', '13900002028', 'sisyphe@sisyphe.com', '文化图书', 'ACTIVE', 'A', false, true, now(), now()),
('t-2029', 'CGV影城', 'COMPANY', '姜电影', '13900002029', 'cgv@cgv.com.cn', '影院娱乐', 'ACTIVE', 'A', true, false, now(), now()),
('t-2030', '威尔士健身', 'COMPANY', '范健身', '13900002030', 'willsg@willsg.com', '运动健身', 'ACTIVE', 'A', true, false, now(), now()),

-- B级 常见连锁
('t-2041', '真功夫快餐', 'COMPANY', '邓快餐', '13900003041', 'zhenkungfu@zhenkungfu.com', '餐饮美食', 'ACTIVE', 'B', false, false, now(), now()),
('t-2042', '味千拉面', 'COMPANY', '曾面馆', '13900003042', 'ajisen@ajisen.com.cn', '餐饮美食', 'ACTIVE', 'B', false, false, now(), now()),
('t-2043', '满记甜品', 'COMPANY', '彭甜品', '13900003043', 'honey@honeydessert.com', '餐饮美食', 'ACTIVE', 'B', false, false, now(), now()),
('t-2044', 'CoCo都可茶饮', 'COMPANY', '潘奶茶', '13900003044', 'coco@goco.com.cn', '茶饮', 'ACTIVE', 'B', false, false, now(), now()),
('t-2045', '书亦烧仙草', 'COMPANY', '姚饮品', '13900003045', 'shuyi@shuyitea.com', '茶饮', 'ACTIVE', 'B', false, true, now(), now()),
('t-2046', '良品铺子', 'COMPANY', '范零食', '13900003046', 'bestore@bestore.com.cn', '休闲食品', 'ACTIVE', 'B', false, false, now(), now()),
('t-2047', '三只松鼠', 'COMPANY', '田坚果', '13900003047', 'three squirrels@3squirrels.com.cn', '休闲食品', 'ACTIVE', 'B', false, true, now(), now()),
('t-2048', '百果园', 'COMPANY', '洪水果', '13900003048', 'pagoda@pagoda.com.cn', '生鲜水果', 'ACTIVE', 'B', false, false, now(), now()),
('t-2049', '眼镜88', 'COMPANY', '石视光', '13900003049', 'glasses88@glasses88.com', '眼镜配饰', 'ACTIVE', 'B', false, false, now(), now()),
('t-2050', '海澜之家', 'COMPANY', '汤男装', '13900003050', 'hla@hla.com.cn', '服装服饰', 'ACTIVE', 'B', false, false, now(), now()),
('t-2051', '七匹狼男装', 'COMPANY', '皮男装', '13900003051', 'septwolves@septwolves.com', '服装服饰', 'ACTIVE', 'B', false, false, now(), now()),
('t-2052', '探路者户外', 'COMPANY', '邹户外', '13900003052', 'toread@toread.com.cn', '运动户外', 'ACTIVE', 'B', false, false, now(), now()),
('t-2053', '巴拉巴拉童装', 'COMPANY', '熊童装', '13900003053', 'balabala@balabala.com', '童装母婴', 'ACTIVE', 'B', false, false, now(), now()),
('t-2054', '安奈儿童装', 'COMPANY', '纪童装', '13900003054', 'annil@annil.com', '童装母婴', 'ACTIVE', 'B', false, false, now(), now()),
('t-2055', '美特斯邦威', 'COMPANY', '尹休闲', '13900003055', 'metersbonwe@mbw.com.cn', '服装服饰', 'ACTIVE', 'B', false, false, now(), now()),

-- C级 / 联发
('t-2061', '麦当劳 McDonalds', 'COMPANY', '贺汉堡', '13900004061', 'mcd@mcdonalds.com.cn', '快餐', 'ACTIVE', 'LIANFA', false, false, now(), now()),
('t-2062', '汉堡王', 'COMPANY', '牛牛肉', '13900004062', 'burgerking@bkchina.cn', '快餐', 'ACTIVE', 'LIANFA', false, false, now(), now()),
('t-2063', '德克士', 'COMPANY', '包炸鸡', '13900004063', 'dicos@dicos.com.cn', '快餐', 'ACTIVE', 'LIANFA', false, false, now(), now()),
('t-2064', '华莱士', 'COMPANY', '蔡快餐', '13900004064', 'wallace@cnwallace.com', '快餐', 'ACTIVE', 'C', false, false, now(), now()),
('t-2065', '绝味鸭脖', 'COMPANY', '卤小吃', '13900004065', 'juewei@juewei.cn', '休闲零食', 'ACTIVE', 'C', false, false, now(), now()),
('t-2066', '蜜雪冰城', 'COMPANY', '冰奶茶', '13900004066', 'mixue@mixue.cn', '茶饮', 'ACTIVE', 'C', false, true, now(), now()),
('t-2067', '沪上阿姨', 'COMPANY', '魏茶饮', '13900004067', 'hushangayi@hushangayi.com', '茶饮', 'ACTIVE', 'C', false, true, now(), now()),
('t-2068', '益禾堂', 'COMPANY', '陶奶茶', '13900004068', 'yihetang@yihetang.com', '茶饮', 'ACTIVE', 'C', false, true, now(), now()),
('t-2069', '小杨生煎', 'COMPANY', '鲍小吃', '13900004069', 'xiaoyang@xiaoyang.com.cn', '小吃', 'ACTIVE', 'C', false, false, now(), now()),
('t-2070', '一鸣真鲜奶吧', 'COMPANY', '韦乳品', '13900004070', 'yiming@yiming.com', '乳品烘焙', 'ACTIVE', 'C', false, false, now(), now());
