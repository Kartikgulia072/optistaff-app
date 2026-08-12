// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ipgoycxqvhptqqubopof.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlwZ295Y3hxdmhwdHFxdWJvcG9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwOTQzMzQsImV4cCI6MjEwMTY3MDMzNH0.hA_iiKqgZpDOW6g3lLUOoQDfQ0twqC-0hLU5mYbBGVI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);