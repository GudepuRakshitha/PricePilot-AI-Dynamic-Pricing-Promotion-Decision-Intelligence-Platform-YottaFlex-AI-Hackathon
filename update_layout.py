with open('C:\\\\CandidateWorkspace\\\\frontend\\\\src\\\\components\\\\Layout.tsx', 'r') as f:
    content = f.read()

# Add About import after the Settings import line
import_line = 'import { Settings, } from \"lucide-react\";'
new_import_line = 'import { Settings, About, } from \"lucide-react\";'
content = content.replace(import_line, new_import_line)

# Add About nav item to System group - add after the Settings item
# Find the System group's items array and add About after Settings
old_system_end = '{\\n    to: \"/settings\",\\n    label: \"Settings\",\\n    icon: Settings\\n},'
new_system_end = '{\\n    to: \"/settings\",\\n    label: \"Settings\",\\n    icon: Settings\\n},\\n{\\n    to: \"/about\",\\n    label: \"About\",\\n    icon: About\\n},'

content = content.replace(old_system_end, new_system_end)

with open('C:\\\\CandidateWorkspace\\\\frontend\\\\src\\\\components\\\\Layout.tsx', 'w') as f:
    f.write(content)

print('Layout.tsx updated successfully')