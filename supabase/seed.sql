-- Starter content. All prices/copy are PLACEHOLDERS — edit them in Admin → Website CMS, then Publish.

insert into public.onboarding_stages (name, sort_order) values
  ('Lead',0),('Demo',1),('Agreement',2),('Setup',3),('Training',4),('Go-live',5),('Support',6)
on conflict (name) do nothing;

insert into public.apps (slug, name, description) values
  ('one-order-pos','One-Order POS','Tablet-first café POS'),
  ('kitchen','Kitchen App','Kitchen display / portal'),
  ('qr-ordering','QR Ordering','Table QR ordering'),
  ('admin','Admin','Admin portal')
on conflict (slug) do nothing;

insert into public.plans (slug,name,badge,best_for,price_monthly,price_yearly,original_price,free_setup_text,features,limits,highlight,status,sort_order) values
 ('starter','Starter',null,'Single counter café',499,4999,799,'Free setup',
   '[{"group":"Core","text":"Order screen + Cook/Customer bills","included":true},{"group":"Core","text":"Thermal printing (2\"/3\")","included":true},{"group":"Core","text":"Kitchen portal","included":false}]',
   '{"outlets":1,"users":2,"printers":1,"tables":10}', false,'published',1),
 ('growth','Growth','Most Popular','Cafés with table service',999,9999,1499,'Free setup',
   '[{"group":"Core","text":"Everything in Starter","included":true},{"group":"Service","text":"Tables + live table status","included":true},{"group":"Service","text":"Kitchen portal","included":true}]',
   '{"outlets":1,"users":5,"printers":2,"tables":30}', true,'published',2),
 ('pro','Pro',null,'Busy restaurants',1799,17999,2499,'Free setup',
   '[{"group":"Core","text":"Everything in Growth","included":true},{"group":"Insight","text":"Dashboard + customer loyalty","included":true},{"group":"Insight","text":"GST-ready bills","included":true}]',
   '{"outlets":1,"users":10,"printers":4,"tables":60}', false,'published',3)
on conflict (slug) do nothing;

insert into public.site_sections (slug, eyebrow, heading, subheading, cta_text, cta_link, sort_order, extra) values
 ('hero','Café POS · Made in Pune','One order. Every table. Zero chaos.','The tablet POS that keeps your kitchen, counter and customers in sync — even offline.','Get FREE setup','#contact',0,'{}'),
 ('story','How it flows','From the first order to the last bill','',null,null,1,
   '{"beats":["Staff taps New Order","Cook Bill prints in the kitchen","More rounds join the same table","One clean Customer Bill closes it"]}'),
 ('features','Built for service','Everything a café actually needs','',null,null,2,'{}'),
 ('pricing','Pricing','Simple plans. Free setup.','',null,null,3,'{}'),
 ('reviews','Loved by owners','Trusted by cafés across Pune','',null,null,4,'{}'),
 ('faq','Questions','Good to know','',null,null,5,'{}'),
 ('cta','Ready?','Get FREE setup for 6 months','Tell us about your café and we will call you back.','Talk to us','#contact',6,'{}')
on conflict (slug) do nothing;

insert into public.features (title, summary, bullets, icon, status, sort_order) values
 ('Cook Bill by round','Kitchen only sees what is new.',array['Prints only the new round','Per-item notes','No repeats'],'ChefHat','published',0),
 ('One bill per table','Consolidated Customer Bill.',array['Items merged across rounds','GST optional','Reprint anytime'],'Receipt','published',1),
 ('Works offline','Keeps running with zero internet.',array['On-device SQLite','Auto-sync when online','No lost orders'],'WifiOff','published',2),
 ('Live tables','See free vs occupied at a glance.',array['Occupied timers','One session per table','Takeaway tabs'],'LayoutGrid','published',3)
on conflict do nothing;

insert into public.business_types (slug,name,tagline,benefits,flow_steps,status,sort_order) values
 ('cafe','Café','Fast counter + table service',array['Quick adds','Round-wise kitchen tickets'],array['Order','Cook bill','Serve','Pay'],'published',0),
 ('restaurant','Restaurant','Multi-table dine-in',array['Table status','Kitchen portal'],array['Seat','Order','Cook','Bill'],'published',1),
 ('bakery','Bakery','Grab-and-go speed',array['Barcode ready','Takeaway tabs'],array['Scan','Bill','Pay'],'published',2)
on conflict (slug) do nothing;

insert into public.faqs (question, answer, category, status, sort_order) values
 ('Does it work without internet?','Yes. The app stores everything on the device and syncs when you are back online.','General','published',0),
 ('Which printers are supported?','2-inch and 3-inch Bluetooth thermal printers.','Hardware','published',1),
 ('What does free setup include?','We set up your menu, tables and printer, and train your staff.','Offer','published',2)
on conflict do nothing;

insert into public.offers (title, popup_headline, perks, badge, button_text, link_target, countdown, bar_text, enabled, status, sort_order) values
 ('Free setup','Click to get FREE SETUP for 6 months',array['Menu upload','Table creation','Printer pairing','Staff training'],'Limited time','Claim free setup','#contact',false,'FREE setup for 6 months — limited cafés this month',true,'published',0)
on conflict do nothing;

insert into public.site_settings (key, value) values
 ('contact', '{"whatsapp":"","email":"","phone":"","address":"Pune, Maharashtra","hours":"Mon–Sat 10:00–19:00"}'),
 ('brand',   '{"name":"One-Order","by":"Cloud Build Tech","accent":"#2563EB","trusted_count":0,"cities":["Pune"]}'),
 ('social',  '{"instagram":"","linkedin":"","youtube":""}')
on conflict (key) do nothing;

insert into public.seo_pages (path, title, description) values
 ('/', 'One-Order — Café POS by Cloud Build Tech', 'Tablet-first café POS with kitchen tickets, table tracking and offline mode. Free setup.')
on conflict (path) do nothing;

insert into public.legal_pages (slug, title, body_md, status) values
 ('privacy','Privacy Policy','_Add your privacy policy in Admin → Legal Pages._','draft'),
 ('terms','Terms of Service','_Add your terms in Admin → Legal Pages._','draft')
on conflict (slug) do nothing;
