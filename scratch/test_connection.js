import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConnection() {
  const { data, error } = await supabase.from('guards').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('Connection failed:', error.message);
  } else {
    console.log('Successfully connected! Guards count:', data);
  }
}

checkConnection();
