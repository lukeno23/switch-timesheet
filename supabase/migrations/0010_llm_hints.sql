-- =============================================================
-- 0010_llm_hints.sql
-- Populate/update LLM classification hints for all categories.
-- Preserves existing hints by appending new context.
-- =============================================================

-- Design categories
UPDATE categories SET llm_hint = 'Visual Identity Design (from scratch).'
  WHERE name = 'Brand Writing';

UPDATE categories SET llm_hint = 'Brand Formalisation (building on an existing logo/identity), CC Element Design.'
  WHERE name = 'Brand Design';

UPDATE categories SET llm_hint = 'Editorial Design (digital and print), Artwork Resizing.'
  WHERE name = 'Production';

UPDATE categories SET llm_hint = 'UI Design, UX/Wireframing, Front End Design (Wordpress sites).'
  WHERE name = 'Web Design';

UPDATE categories SET llm_hint = 'Animation / Motion Graphics, Video Editing.'
  WHERE name = 'Motion';

UPDATE categories SET llm_hint = 'Photo Shoots, Photo Editing.'
  WHERE name = 'Photography';

UPDATE categories SET llm_hint = 'Illustrations, Mood Boarding, Story Boarding.'
  WHERE name = 'Misc Design';

-- PM categories
UPDATE categories SET llm_hint = 'Asana, calendar management, external calendar management.'
  WHERE name = 'Task management';

UPDATE categories SET llm_hint = 'Client Emails.'
  WHERE name = 'Client Admin';

UPDATE categories SET llm_hint = 'Report Analysis, Compiling Reports.'
  WHERE name = 'Reporting';

UPDATE categories SET llm_hint = 'Maintaining 3-month plans, Content calendars.'
  WHERE name = 'CC Management';

UPDATE categories SET llm_hint = 'Scheduling newsletters, Configuring drip campaigns.'
  WHERE name = 'Email Marketing';

UPDATE categories SET llm_hint = 'Campaign creation/optimization/boosting, Ad setup, Boosting posts.'
  WHERE name = 'Paid Management';

UPDATE categories SET llm_hint = 'Scheduling/posting posts, Setting up events, Analyzing/updating profiles, Looking for ICOM posts.'
  WHERE name = 'Social Media Management';

UPDATE categories SET llm_hint = 'Captions, case studies, articles.'
  WHERE name = 'Copywriting';

UPDATE categories SET llm_hint = 'Creating new 3-month plans.'
  WHERE name = 'Strategy';

UPDATE categories SET llm_hint = 'Hubspot edits.'
  WHERE name = 'CRM Management';

UPDATE categories SET llm_hint = 'Updating/checking directory profiles.'
  WHERE name = 'Directory Management';

UPDATE categories SET llm_hint = 'Any Wordpress/CMS updates or configuration.'
  WHERE name = 'Web Management';

-- Cross-Department categories
UPDATE categories SET llm_hint = 'Timesheets, Dashlane, etc.'
  WHERE name = 'Admin';

UPDATE categories SET llm_hint = 'All email-related work.'
  WHERE name = 'Emails';

UPDATE categories SET llm_hint = 'Design briefs, writing briefs, etc.'
  WHERE name = 'Brief writing';

UPDATE categories SET llm_hint = 'Naming, design, campaign ideas, etc.'
  WHERE name = 'Brainstorming';

UPDATE categories SET llm_hint = 'Personal and designated reviews. Designs, writing, reports, etc.'
  WHERE name = 'QA';

UPDATE categories SET llm_hint = 'Anything that does not fit into any other categories.'
  WHERE name = 'Misc';

UPDATE categories SET llm_hint = 'Research of any kind.'
  WHERE name = 'Research';

UPDATE categories SET llm_hint = 'Contributing skills to a pitch or proposal.'
  WHERE name = 'Pitch Work';

UPDATE categories SET llm_hint = 'Internal meetings that are not about specific clients.'
  WHERE name = 'Non-Client Meeting';

UPDATE categories SET llm_hint = 'External meetings with clients or suppliers.'
  WHERE name = 'External Client Meeting';

UPDATE categories SET llm_hint = 'Internal meetings about client work.'
  WHERE name = 'Internal Client Meeting';

-- Categories with existing hints — append new context
UPDATE categories SET llm_hint = 'Anything related to payments or invoices. Statements, payroll, billing, etc.'
  WHERE name = 'Accounts';

UPDATE categories SET llm_hint = 'Most of Richard and Melissa''s external one-to-one meetings are BD. Meetings with prospects, quoting, prospecting, presentations, etc.'
  WHERE name = 'Business Development';

UPDATE categories SET llm_hint = 'Only for tasks that specifically say an LLM or ''Colleague'' or ''GPT'' is being set-up or configured. Setting up Claude projects, Gems, CustomGPTs.'
  WHERE name = 'Configuring LLM';

-- Management categories
UPDATE categories SET llm_hint = 'Management meetings, business strategy, finance meetings, pricing, etc.'
  WHERE name = 'Operations';

UPDATE categories SET llm_hint = 'Interviews, quarterly catch-ups, recruitment, etc.'
  WHERE name = 'HR';
