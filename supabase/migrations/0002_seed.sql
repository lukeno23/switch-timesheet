-- =============================================================
-- 0002_seed.sql
-- Seed reference data for Switch Timesheet pipeline
-- 15 Switchers, ~35 clients, ~17 aliases, ~35 categories
-- =============================================================

-- ----- Switchers (15 total) -----
-- Source: CalendarExtractor.gs (emails), process_export.py (PRIMARY_DEPT, MANAGEMENT_MEMBERS)
INSERT INTO switchers (name, email, primary_dept, is_management_member) VALUES
  ('Andrea',   'andrea@switch.com.mt',   'Design',     true),
  ('Camille',  'camille@switch.com.mt',  'PM',         false),
  ('Ed',       'ed@switch.com.mt',       'Brand',      true),
  ('Ernesta',  'ernesta@switch.com.mt',  'Marketing',  false),
  ('Fanny',    'fanny@switch.com.mt',    'PM',         false),
  ('Kathleen', 'kathleen@switch.com.mt', 'PM',         false),
  ('Kim',      'kim@switch.com.mt',      'Marketing',  false),
  ('Laura C',  'laura@switch.com.mt',    'PM',         false),
  ('Laura P',  'lpulecio@switch.com.mt', 'Design',     false),
  ('Lisa',     'lisa@switch.com.mt',     'Management', true),
  ('Luke',     'luke@switch.com.mt',     'Marketing',  true),
  ('Melissa',  'melissa@switch.com.mt',  'Management', true),
  ('Naomi',    'naomi@switch.com.mt',    'Design',     false),
  ('Nella',    'nella@switch.com.mt',    'Design',     false),
  ('Richard',  'richard@switch.com.mt',  'Management', true);

-- ----- Clients (~35 total) -----
-- Source: instructions.md "Known Clients" section
INSERT INTO clients (name) VALUES
  ('ACAMH'),
  ('Agenda'),
  ('Alter Domus'),
  ('APS'),
  ('Beewits'),
  ('CEL'),
  ('CEL & CWL'),
  ('Credence'),
  ('CWL'),
  ('Edwards Lowell'),
  ('Eterna'),
  ('Furnitubes'),
  ('Fuse'),
  ('Fyorin'),
  ('HPV'),
  ('HSF'),
  ('ICOM'),
  ('Instasmile'),
  ('Internal'),
  ('Kalon'),
  ('Levaris'),
  ('Lucy'),
  ('MIA'),
  ('Moneybase'),
  ('Olympus'),
  ('onepercent'),
  ('onepercent/Scavolini'),
  ('Palazzo Parisio'),
  ('Pangea'),
  ('Scavolini'),
  ('Sigma'),
  ('Switch'),
  ('Together Gaming');

-- ----- Client Aliases (~17 total) -----
-- Source: instructions.md "Client Name Aliases and Corrections" table
INSERT INTO client_aliases (client_id, alias) VALUES
  ((SELECT id FROM clients WHERE name = 'Palazzo Parisio'), 'Palazzo'),
  ((SELECT id FROM clients WHERE name = 'Palazzo Parisio'), 'PP'),
  ((SELECT id FROM clients WHERE name = 'Levaris'), 'WRH'),
  ((SELECT id FROM clients WHERE name = 'Alter Domus'), 'AD'),
  ((SELECT id FROM clients WHERE name = 'Fyorin'), 'FYO'),
  ((SELECT id FROM clients WHERE name = 'Fyorin'), 'Fyrion'),
  ((SELECT id FROM clients WHERE name = 'Lucy'), ':ucy'),
  ((SELECT id FROM clients WHERE name = 'Internal'), 'Inernal'),
  ((SELECT id FROM clients WHERE name = 'Instasmile'), 'instasmile'),
  ((SELECT id FROM clients WHERE name = 'onepercent'), 'Onepercent'),
  ((SELECT id FROM clients WHERE name = 'Edwards Lowell'), 'ELCOL'),
  ((SELECT id FROM clients WHERE name = 'CEL & CWL'), 'CWL & CEL'),
  ((SELECT id FROM clients WHERE name = 'CEL & CWL'), 'CWL CEL'),
  ((SELECT id FROM clients WHERE name = 'onepercent/Scavolini'), 'onepercent & Scavolini'),
  ((SELECT id FROM clients WHERE name = 'onepercent/Scavolini'), 'Scavolini & onepercent'),
  ((SELECT id FROM clients WHERE name = 'onepercent/Scavolini'), 'Scavolini/onepercent'),
  ((SELECT id FROM clients WHERE name = 'APS'), 'APS & Sicav'),
  ((SELECT id FROM clients WHERE name = 'APS'), 'APS SICAV');

-- ----- Categories (~35 total) -----
-- Source: instructions.md Legend section + process_export.py category constants
-- Design Department
INSERT INTO categories (name, department) VALUES
  ('Brand Design',           'Design'),
  ('Production',             'Design'),
  ('Web Design',             'Design'),
  ('Motion',                 'Design'),
  ('Photography',            'Design'),
  ('Misc Design',            'Design');

-- PM Department
INSERT INTO categories (name, department) VALUES
  ('Task management',        'PM'),
  ('Client Admin',           'PM');

-- Marketing Department
INSERT INTO categories (name, department) VALUES
  ('Reporting',              'Marketing'),
  ('CC Management',          'Marketing'),
  ('Email Marketing',        'Marketing'),
  ('Paid Management',        'Marketing'),
  ('Social Media Management','Marketing'),
  ('Strategy',               'Marketing'),
  ('CRM Management',         'Marketing'),
  ('Directory Management',   'Marketing'),
  ('Web Management',         'Marketing'),
  ('Copywriting',            'Marketing');

-- Cross-Department (assigned to Switcher's primary dept at runtime)
INSERT INTO categories (name, department) VALUES
  ('Brief writing',          'Cross-Department'),
  ('Brainstorming',          'Cross-Department'),
  ('Emails',                 'Cross-Department'),
  ('QA',                     'Cross-Department'),
  ('Misc',                   'Cross-Department'),
  ('Research',               'Cross-Department'),
  ('Pitch Work',             'Cross-Department'),
  ('Non-Client Meeting',     'Cross-Department'),
  ('External Client Meeting','Cross-Department'),
  ('Internal Client Meeting','Cross-Department'),
  ('Configuring LLM',        'Cross-Department'),
  ('Admin',                  'Cross-Department');

-- Brand Department
INSERT INTO categories (name, department) VALUES
  ('Brand Writing',          'Brand');

-- Management Department
INSERT INTO categories (name, department) VALUES
  ('Accounts',               'Management'),
  ('Operations',             'Management'),
  ('Business Development',   'Management'),
  ('HR',                     'Management');
