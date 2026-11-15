with open('C:\\\\CandidateWorkspace\\\\frontend\\\\src\\\\components\\\\Layout.tsx', 'r') as f:
    lines = f.readlines()

# Find the System group's Settings item and add About after it
for i, line in enumerate(lines):
    if 'to: "/settings"' in line and 'label: "Settings"' in line:
        # This is the Settings nav item - add About after it
        about_line = '{\n    to: "/about",\n    label: "About",\n    icon: About\n},\n'
        lines.insert(i+1, about_line)
        print(f'About nav item inserted after line {i+1}')
        break

with open('C:\\\\CandidateWorkspace\\\\frontend\\\\src\\\\components\\\\Layout.tsx', 'w') as f:
    f.writelines(lines)

print('Layout.tsx updated')