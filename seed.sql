-- Optional development seed. Remove/replace before production.
INSERT OR IGNORE INTO categories (id,name,slug,sort_order) VALUES
('cat-demo-1','إلكترونيات','electronics',1),
('cat-demo-2','عناية شخصية','personal-care',2),
('cat-demo-3','إكسسوارات','accessories',3);

INSERT OR IGNORE INTO products
(id,category_id,name,slug,description,image_url,price,compare_at_price,commission_rate,stock,status)
VALUES
('prod-demo-1','cat-demo-1','سماعة بلوتوث','bluetooth-headset','منتج تجريبي للواجهة','',185000,210000,10,50,'active'),
('prod-demo-2','cat-demo-3','ساعة رجالية','mens-watch','منتج تجريبي للواجهة','',120000,145000,12,30,'active'),
('prod-demo-3','cat-demo-2','عطر رجالي','mens-perfume','منتج تجريبي للواجهة','',95000,115000,10,25,'active');
