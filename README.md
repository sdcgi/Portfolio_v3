# Folder-driven Portfolio & Motion Site

This site auto-generates manifests from the `public/` folder structure.  
All ordering, covers, and overrides are controlled by simple text dot-files.  
No manual coding is required for adding new work.

---

## Convenience files

The generator creates small helper files in each folder for **copy-paste convenience**:

- `.images` — list of all images in that folder.  
  Includes a header showing available directives.
- `.videos` — list of all video keys in a Motion project folder.  
  Includes directive header.
- `.folders` — list of subfolders in a folder.  
  No directive header.

⚠️ These files are **always regenerated** — don’t hand-edit them.  
Use them as ready-made lists to copy into `.order` files if you want custom ordering.

---

## Directives (overrides)

At the top of any `.order` file, you can declare **directives**.  
They act as **overrides to the global defaults** (set in `variables.css`).  
Supported directives:

```txt
max_columns = 3    # override the default maximum number of columns (1–8)
aspect_ratio = 3/2 # override tile aspect ratio
                   # (0 = respect original media’s aspect ratio)
title_display = 0  # 0 = hide titles, 1 = show titles
