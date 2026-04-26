import { supabase } from '@/data/supabase';

test('supabase client initializes', () => {
  expect(supabase).toBeDefined();
  expect(typeof supabase.from).toBe('function');
});
