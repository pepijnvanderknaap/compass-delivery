# Deployment Information

## Production URL

**The correct production URL is:**
```
https://compass-kitchen-orders.vercel.app
```

## Important Notes

⚠️ **Repository vs Project Name Mismatch**
- GitHub Repository: `compass-delivery`
- Vercel Project Name: `compass-kitchen-orders`
- **Always use the Vercel project name in URLs**

## Common Mistakes to Avoid

❌ **WRONG URLs** (these won't work or show old cached versions):
- `https://compass-delivery.vercel.app` (404 - project doesn't exist)
- `https://compass-delivery-qdxcu4ocq-pepijn-van-der-knaaps-projects.vercel.app` (preview/deployment-specific URL - can be outdated)

✅ **CORRECT URL**:
- `https://compass-kitchen-orders.vercel.app` (production URL - always up to date)

## Accessing Admin Pages

**Dish Management:**
```
https://compass-kitchen-orders.vercel.app/admin/dishes
```

**Menu Management:**
```
https://compass-kitchen-orders.vercel.app/admin/menus
```

**Location Management:**
```
https://compass-kitchen-orders.vercel.app/admin/locations
```

## When Making Changes

1. Push your changes to GitHub
2. Vercel automatically deploys
3. Wait for deployment to complete (check Vercel dashboard)
4. **Always test using**: `https://compass-kitchen-orders.vercel.app`
5. Use incognito mode if you see cached content

## Vercel Project Details

- **Project ID**: `prj_7md2TmXOqDFizuLSLzQ79Oi3XeqP`
- **Org ID**: `team_XptZngSqkCp8VyrOQlpfvRKt`
- **Project Name**: `compass-kitchen-orders`
- **Connected Repo**: `pepijnvanderknaap/compass-delivery`

## Cache Issues

If you see outdated content:
1. Open in incognito mode: `Cmd + Shift + N`
2. Navigate to: `https://compass-kitchen-orders.vercel.app`
3. Hard refresh: `Cmd + Shift + R`
