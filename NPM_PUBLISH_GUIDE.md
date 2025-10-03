# 📦 راهنمای انتشار در NPM

## پیش‌نیازها

1. **حساب NPM:**
   ```bash
   npm adduser
   # یا
   npm login
   ```

2. **بررسی نام پکیج:**
   ```bash
   npm search @sentineltm/cli
   ```

## مراحل انتشار

### 1. آماده‌سازی

```bash
# نصب dependencies
npm install

# Build پروژه
npm run build

# تست
npm test

# بررسی کیفیت
npm run gate
```

### 2. بررسی فایلهای پکیج

```bash
# مشاهده فایلهایی که در پکیج قرار می‌گیرند
npm pack --dry-run
```

خروجی باید شامل:
- `dist/` - فایلهای build شده
- `README.md` - مستندات
- `LICENSE` - مجوز
- `package.json` - تنظیمات

### 3. تست محلی

```bash
# ساخت پکیج محلی
npm pack

# نصب محلی در پروژه دیگر
cd /path/to/test-project
npm install /path/to/sentineltm-cli-1.2.0.tgz

# تست دستورات
npx st --version
npx st status
```

### 4. انتشار

```bash
# انتشار نسخه عمومی
npm publish --access public

# یا برای نسخه beta
npm publish --tag beta --access public
```

### 5. تأیید انتشار

```bash
# بررسی در npm
npm view @sentineltm/cli

# نصب از npm
npm install -g @sentineltm/cli

# تست
st --version
st status
```

## مدیریت نسخه‌ها

### Semantic Versioning

```bash
# Patch (1.2.0 → 1.2.1)
npm version patch

# Minor (1.2.0 → 1.3.0)
npm version minor

# Major (1.2.0 → 2.0.0)
npm version major
```

### انتشار نسخه جدید

```bash
# 1. بروزرسانی نسخه
npm version patch -m "Release v%s"

# 2. Build
npm run build

# 3. انتشار
npm publish --access public

# 4. Push به Git
git push && git push --tags
```

## نسخه‌های Beta/Alpha

```bash
# نسخه beta
npm version prerelease --preid=beta
npm publish --tag beta --access public

# نصب beta
npm install -g @sentineltm/cli@beta

# نسخه alpha
npm version prerelease --preid=alpha
npm publish --tag alpha --access public
```

## حذف نسخه (Unpublish)

```bash
# حذف نسخه خاص (فقط تا 72 ساعت)
npm unpublish @sentineltm/cli@1.2.0

# حذف کل پکیج (خطرناک!)
npm unpublish @sentineltm/cli --force
```

## بروزرسانی مستندات

```bash
# بروزرسانی README در npm
npm publish --access public
```

## Scoped Package

پکیج با scope `@sentineltm/cli` منتشر می‌شود:

**مزایا:**
- نام منحصر به فرد
- گروه‌بندی پکیج‌ها
- مدیریت بهتر

**نصب:**
```bash
npm install -g @sentineltm/cli
```

## چک‌لیست قبل از انتشار

- [ ] `npm run build` موفق
- [ ] `npm test` موفق
- [ ] `npm run gate` موفق
- [ ] `README.md` بروز است
- [ ] `CHANGELOG.md` بروز است
- [ ] نسخه در `package.json` صحیح است
- [ ] `LICENSE` موجود است
- [ ] `.npmignore` صحیح است
- [ ] تست محلی با `npm pack` انجام شد

## دستورات مفید

```bash
# مشاهده اطلاعات پکیج
npm view @sentineltm/cli

# مشاهده نسخه‌ها
npm view @sentineltm/cli versions

# مشاهده آمار دانلود
npm view @sentineltm/cli downloads

# لینک محلی برای توسعه
npm link
cd /path/to/test-project
npm link @sentineltm/cli
```

## خطاهای رایج

### "Package name too similar"
نام پکیج شبیه پکیج دیگری است. نام را تغییر دهید.

### "You must verify your email"
ایمیل خود را در npm تأیید کنید.

### "402 Payment Required"
برای scoped packages عمومی از `--access public` استفاده کنید.

### "403 Forbidden"
مجوز انتشار ندارید. با `npm login` وارد شوید.

## منابع

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm CLI Commands](https://docs.npmjs.com/cli/v10/commands)

---

**نکته:** همیشه قبل از انتشار، پکیج را به صورت محلی تست کنید!
