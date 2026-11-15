with open('C:\\CandidateWorkspace\\frontend\\src\\pages\\DeveloperProfile.tsx', 'r') as f:
    lines = f.readlines()

# Remove the JSX comment line at index 318 (0-based)
# Line 319 in 1-based = index 318 in 0-based
if len(lines) > 318 and '{/* Social & Professional Links */}' in lines[318]:
    del lines[318]
    print(f"Removed line 319: {lines[318]}")
else:
    print("Line 319 doesn't have the expected comment")

with open('C:\\CandidateWorkspace\\frontend\\src\\pages\\DeveloperProfile.tsx', 'w') as f:
    f.writelines(lines)
    print("File rewritten")