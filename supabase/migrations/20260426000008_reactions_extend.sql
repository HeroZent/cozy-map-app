-- Extend reaction_emoji enum with 'thought' and 'care' values
alter type reaction_emoji add value if not exists 'thought';
alter type reaction_emoji add value if not exists 'care';
