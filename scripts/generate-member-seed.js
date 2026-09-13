const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('src/data/members.ts', 'utf8')
  .replace(/export interface Member \{[\s\S]*?\n\}\s*/, '')
  .replace('export const MEMBERS: Member[] =', 'MEMBERS =')
  .split('\nexport function getInitials')[0];

const context = {};
vm.createContext(context);
vm.runInContext(`${source}; result = MEMBERS;`, context);
const members = context.result;

if (!Array.isArray(members) || members.length !== 23) {
  throw new Error(`Expected 23 members, found ${members?.length ?? 0}`);
}

const quote = (value) => value == null ? 'NULL' : `'${String(value).replace(/'/g, "''")}'`;
const rows = members.map((member) => `  (${quote(member.email.toLowerCase())}, ${quote(member.displayName)}, ${quote(member.lifeWork)}, ${quote(member.relationshipStatus)}, ${quote(member.hobbies)}, ${quote(member.pathDuration)}, ${quote(member.connectionStrength)}, ${quote(member.desiredQuality)}, 'member'::public.member_role, true, false)`).join(',\n');

const output = `-- PT100: seed the 23 existing real members as approved profiles.\n-- Safe to run more than once because email is unique.\nINSERT INTO public.user_profiles\n  (email, display_name, life_work, relationship_status, hobbies, path_duration, connection_strength, desired_quality, role, is_approved, is_removed)\nVALUES\n${rows}\nON CONFLICT (email) DO UPDATE SET\n  display_name = EXCLUDED.display_name,\n  life_work = EXCLUDED.life_work,\n  relationship_status = EXCLUDED.relationship_status,\n  hobbies = EXCLUDED.hobbies,\n  path_duration = EXCLUDED.path_duration,\n  connection_strength = EXCLUDED.connection_strength,\n  desired_quality = EXCLUDED.desired_quality;\n\nINSERT INTO public.group_members (group_id, user_id)\nSELECT g.id, p.id\nFROM public.groups g\nCROSS JOIN public.user_profiles p\nWHERE g.name = 'PT100'\n  AND p.is_approved = true\n  AND p.is_removed = false\nON CONFLICT (group_id, user_id) DO NOTHING;\n`;

fs.mkdirSync('supabase/migrations', { recursive: true });
fs.writeFileSync('supabase/migrations/20260913160000_seed_pt100_members.sql', output);
console.log(`Generated seed for ${members.length} members.`);
