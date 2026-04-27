import type { ValidationResult } from "@/types";

// ── SQLi Login ────────────────────────────────────────────────────────────────

export function validateSqliLoginRoute(code: string): ValidationResult {
  if (/'\s*\+\s*(username|password)/.test(code))
    return {
      pass: false,
      feedback: "❌ Still concatenating strings — use ? placeholders.",
    };
  if (
    /`[^`]*\$\{username\}[^`]*`/.test(code) ||
    /`[^`]*\$\{password\}[^`]*`/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ Still using template literal interpolation — still injectable.",
    };
  if (
    !/WHERE username\s*=\s*\?/.test(code.replace(/\s+/g, " ")) &&
    !/\?.*AND.*\?/.test(code.replace(/\s+/g, " "))
  )
    return {
      pass: false,
      feedback:
        "❌ Missing ? placeholders. Replace ${username} and ${password} with ?.",
    };
  if (!/db\.query\s*\([^,]+,\s*\[/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Pass [username, password] as the second argument to db.query().",
    };
  if (/stack:\s*err\.stack/.test(code))
    return {
      pass: false,
      feedback: "❌ Still leaking err.stack in the error response — remove it.",
    };
  return {
    pass: true,
    feedback:
      "✅ Route fixed! Parameterized query active, no stack trace leak.",
  };
}

export function validateSqliLoginPage(code: string): ValidationResult {
  if (!/sqliFixed\s*&&\s*isInjection|isInjection\s*&&\s*sqliFixed/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Missing if (sqliFixed && isInjection) check in handleLogin.",
    };
  if (!/setAttackBlocked\s*\(\s*true\s*\)/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Need to call setAttackBlocked(true) and return early when blocked.",
    };
  if (!/pushRealAttack/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Call pushRealAttack() to log the blocked attempt to the defense console.",
    };
  return {
    pass: true,
    feedback:
      "✅ Page fixed! Client blocks and logs injection attempts when patched.",
  };
}

// ── SQLi Search ───────────────────────────────────────────────────────────────

export function validateSqliSearchRoute(code: string): ValidationResult {
  if (/LIKE\s*'%'\s*\+/.test(code) || /\+\s*query\s*\+/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Still concatenating strings in the LIKE clause — use ? placeholder.",
    };
  if (/`[^`]*\$\{query\}[^`]*`/.test(code) || /LIKE\s*'%\$\{/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Still interpolating query into the SQL string — still injectable.",
    };
  if (
    !/LIKE\s*\?/.test(code.replace(/\s+/g, " ")) &&
    !/db\.query\s*\([^,]+,\s*\[/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ Missing ? placeholder. Use: WHERE username LIKE ? with [`%${query}%`].",
    };
  if (/stack:\s*err\.stack/.test(code))
    return {
      pass: false,
      feedback: "❌ Still leaking err.stack in the error response — remove it.",
    };
  return {
    pass: true,
    feedback:
      "✅ Route fixed! Parameterized LIKE query active, no stack trace leak.",
  };
}

export function validateSqliSearchPage(code: string): ValidationResult {
  if (!/sqliFixed\s*&&\s*isInjection|isInjection\s*&&\s*sqliFixed/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Missing if (sqliFixed && isInjection) check in runSearch().",
    };
  if (!/setAttackBlocked\s*\(\s*true\s*\)/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Need to call setAttackBlocked(true) when the patch is active.",
    };
  if (!/pushRealAttack/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Call pushRealAttack(query, false) to log the blocked attempt.",
    };
  if (
    !/pushRealAttack[^}]+return/.test(code.replace(/\n/g, " ")) &&
    !(/setAttackBlocked/.test(code) && /return/.test(code))
  )
    return {
      pass: false,
      feedback:
        "❌ Must return early after blocking — don't let the fetch proceed.",
    };
  return {
    pass: true,
    feedback:
      "✅ Page fixed! Client blocks and logs search injection attempts when patched.",
  };
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export function validateJwtAuth(code: string): ValidationResult {
  if (/'none'|"none"/.test(code))
    return {
      pass: false,
      feedback: '❌ "none" is still in the algorithms list — remove it.',
    };
  if (
    /jwt\.verify\s*\([^,]+,\s*(process\.env\.JWT_SECRET\s*\|\|[^)]+|['"]secret['"])\s*\)/.test(
      code.replace(/\s+/g, " "),
    )
  )
    return {
      pass: false,
      feedback:
        '❌ jwt.verify() still uses || "secret" fallback. Use process.env.JWT_SECRET! instead.',
    };
  if (!/algorithms\s*:\s*\[/.test(code))
    return {
      pass: false,
      feedback: '❌ Missing algorithms: ["HS256"] option in jwt.verify().',
    };
  if (!/'HS256'|"HS256"/.test(code))
    return {
      pass: false,
      feedback: '❌ Specify "HS256" as the only allowed algorithm.',
    };
  if (
    /jwt\.sign\s*\([^,]+,\s*process\.env\.JWT_SECRET\s*\|\|/.test(
      code.replace(/\s+/g, " "),
    )
  )
    return {
      pass: false,
      feedback: '❌ signToken() still has || "secret" fallback — fix it too.',
    };
  return {
    pass: true,
    feedback: "✅ Auth fixed! HS256 enforced, weak secret removed.",
  };
}

export function validateJwtRoute(code: string): ValidationResult {
  if (
    /WHERE id=\$\{/.test(code) ||
    /WHERE id='\$/.test(code) ||
    /`[^`]*\$\{userId\}[^`]*`/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ Still using string interpolation in the SQL query — use ? placeholder.",
    };
  if (!/db\.query\s*\([^,]+,\s*\[userId\]/.test(code.replace(/\s+/g, " ")))
    return {
      pass: false,
      feedback: "❌ Use: db.query('SELECT ... WHERE id = ?', [userId])",
    };
  if (
    !/dbUser\.id.*decoded\.id|decoded\.id.*dbUser\.id|String\(dbUser\.id\).*String\(decoded\.id\)/.test(
      code.replace(/\s+/g, " "),
    )
  )
    return {
      pass: false,
      feedback:
        "❌ Add an ownership check: if dbUser.id !== decoded.id → return 403.",
    };
  if (!/403/.test(code) || !/[Ff]orbidden/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Return a 403 Forbidden response when the ownership check fails.",
    };
  if (/stack:\s*err\.stack/.test(code))
    return {
      pass: false,
      feedback: "❌ Still leaking err.stack in the catch block — remove it.",
    };
  return {
    pass: true,
    feedback:
      "✅ Route fixed! Parameterized query + ownership check + no stack leak.",
  };
}

// ── XSS ───────────────────────────────────────────────────────────────────────

export function validateXss(code: string): ValidationResult {
  if (/dangerouslySetInnerHTML/.test(code))
    return {
      pass: false,
      feedback:
        "❌ dangerouslySetInnerHTML is still present — remove it entirely.",
    };
  if (!/\{lastTransfer\.note\}|\{note\}/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Render lastTransfer.note as a JSX text node: {lastTransfer.note}",
    };
  if (!/\{u\.username\}|\{username\}/.test(code))
    return {
      pass: false,
      feedback: "❌ Render u.username as a JSX text node: {u.username}",
    };
  return {
    pass: true,
    feedback:
      "✅ Correct! JSX auto-escapes text nodes, preventing script injection.",
  };
}

// ── IDOR ──────────────────────────────────────────────────────────────────────

export function validateIdor(code: string): ValidationResult {
  if (/WHERE id=\$\{/.test(code) || /WHERE id='\$/.test(code))
    return {
      pass: false,
      feedback: "❌ Still using string interpolation in the SQL query.",
    };
  if (
    !/query\s*\(\s*['"`]SELECT.*WHERE id\s*=\s*\?['"`]/.test(
      code.replace(/\s+/g, " "),
    )
  )
    return {
      pass: false,
      feedback:
        "❌ Use: db.query('SELECT * FROM users WHERE id = ?', [decoded.id])",
    };
  if (!/403/.test(code) || !/[Ff]orbidden/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Return a 403 Forbidden response when user.id !== decoded.id.",
    };
  return {
    pass: true,
    feedback:
      "✅ Correct! Server-side ownership checks prevent IDOR even with forged JWTs.",
  };
}

// ── SQLi Transactions GET ─────────────────────────────────────────────────────

export function validateSqliTxnRoute(code: string): ValidationResult {
  // Must not interpolate userId into the query string
  if (
    /`[^`]*\$\{userId\}[^`]*`/.test(code) ||
    /WHERE user_id=\$\{/.test(code) ||
    /WHERE user_id='\$/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ Still interpolating userId into the SQL query — use ? placeholder.",
    };
  // Must use parameterized query
  if (!/db\.query\s*\([^,]+,\s*\[/.test(code))
    return {
      pass: false,
      feedback: "❌ Pass [userId] as the second argument to db.query().",
    };
  if (!/WHERE user_id\s*=\s*\?/.test(code.replace(/\s+/g, " ")))
    return {
      pass: false,
      feedback: "❌ Use: WHERE user_id = ? with userId passed as a parameter.",
    };
  // Must add auth check — verify token and ownership
  if (!/getUserFromToken|Authorization|Bearer/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Add an auth check — verify the Bearer token before querying.",
    };
  if (!/decoded\.id|tokenUserId|authenticatedId/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Extract the user ID from the verified token, not the query param.",
    };
  if (!/403|[Ff]orbidden|[Uu]nauthorized|401/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Return 401/403 if the token userId doesn't match the requested userId.",
    };
  // Must not echo the raw query back in the response
  if (
    /success.*query|query.*success/.test(code.replace(/\s+/g, " ")) &&
    /query,/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ Remove the raw query field from the success response — it leaks SQL.",
    };
  // Must not expose stack trace
  if (/stack:\s*err\.stack/.test(code))
    return {
      pass: false,
      feedback: "❌ Remove stack: err.stack from the error response.",
    };
  return {
    pass: true,
    feedback:
      "✅ Route fixed! Parameterized query, auth check, no query/stack leaks.",
  };
}

export function validateSqliTxnPage(code: string): ValidationResult {
  // Must not pass manualUserId directly — lookup panel should be removed or access-controlled
  if (
    /\/api\/transactions\?userId=\$\{encodeURIComponent\(manualUserId\)\}/.test(
      code,
    ) &&
    !/patchedTxn|txnFixed|disabled/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ The free-form userId lookup panel still fires — disable it or require auth.",
    };
  if (
    /manualUserId/.test(code) &&
    !/disabled|hidden|removed|patched/.test(code)
  )
    return {
      pass: false,
      feedback:
        "❌ Remove or gate the manual userId input — it's the IDOR entry point.",
    };
  return {
    pass: true,
    feedback: "✅ Page fixed! Unauthenticated userId lookup panel disabled.",
  };
}

// ── SQLi Transactions POST (INSERT) ──────────────────────────────────────────

export function validateSqliTxnInsert(code: string): ValidationResult {
  // Must not interpolate values into INSERT
  if (/VALUES\s*\(\s*\$\{|VALUES\s*\([^?]*\$\{/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Still interpolating values into the INSERT statement — use ? placeholders.",
    };
  if (/`[^`]*\$\{(fromUserId|amount|description)\}[^`]*`/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Template literal interpolation in INSERT — still injectable.",
    };
  // Must use parameterized INSERT
  if (!/db\.query\s*\([^,]+,\s*\[/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Use db.query(sql, [fromUserId, amount, description]) with ? placeholders.",
    };
  if (!/VALUES\s*\(\s*\?,\s*\?,\s*\?/.test(code.replace(/\s+/g, " ")))
    return {
      pass: false,
      feedback:
        "❌ Use VALUES (?, ?, ?) in your INSERT and pass values as parameters.",
    };
  // Must validate amount is a positive number
  if (!/parseFloat|Number|isNaN|amount\s*>\s*0|amount\s*<=\s*0/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Validate that amount is a positive number — negative values allow fake credits.",
    };
  // Must have auth check
  if (!/getUserFromToken|Authorization|Bearer/.test(code))
    return {
      pass: false,
      feedback:
        "❌ Add an auth check — verify the token before recording any transaction.",
    };
  return {
    pass: true,
    feedback:
      "✅ INSERT fixed! Parameterized query, amount validated, auth verified.",
  };
}

// ── XSS Transactions page ─────────────────────────────────────────────────────

export function validateXssTxn(code: string): ValidationResult {
  // Must not render raw JSON dump
  if (/JSON\.stringify\s*\(\s*t\s*\)/.test(code))
    return {
      pass: false,
      feedback:
        "❌ JSON.stringify(t) is still rendered in JSX — remove the raw dump entirely.",
    };
  // Must not render password_hash
  if (/t\.password_hash/.test(code))
    return {
      pass: false,
      feedback:
        "❌ t.password_hash is still referenced in the render — never display credential fields.",
    };
  // Must not use dangerouslySetInnerHTML for transaction data
  if (/dangerouslySetInnerHTML/.test(code))
    return {
      pass: false,
      feedback:
        "❌ dangerouslySetInnerHTML is present — remove it and use safe JSX text nodes.",
    };
  // Description must be rendered as text node, not raw HTML
  if (/\{t\.description\}/.test(code) && !/dangerouslySetInnerHTML/.test(code))
    return {
      pass: true,
      feedback:
        "✅ Transactions page fixed! No raw dump, no dangerouslySetInnerHTML, credentials hidden.",
    };
  // If description isn't rendered at all that's also fine
  if (
    !/t\.description/.test(code) &&
    !/dangerouslySetInnerHTML/.test(code) &&
    !/JSON\.stringify/.test(code)
  )
    return {
      pass: true,
      feedback: "✅ Transactions page fixed! No unsafe rendering paths remain.",
    };
  return {
    pass: false,
    feedback:
      "❌ Render t.description as a safe JSX text node: {t.description}",
  };
}

// ── Open Redirect ─────────────────────────────────────────────────────────────

export function validateOpenRedirectRoute(code: string): ValidationResult {
  if (!/ALLOWED_PATHS|allowList|allowedPaths|whitelist/i.test(code))
    return { pass: false, feedback: "❌ Define an ALLOWED_PATHS allowlist of safe internal paths." };
  if (!/ALLOWED_PATHS\.includes|allowList\.includes|allowedPaths\.includes/i.test(code))
    return { pass: false, feedback: "❌ Check if the destination is in ALLOWED_PATHS before redirecting." };
  if (!/404|403|400|Forbidden|Bad Request|Invalid/i.test(code))
    return { pass: false, feedback: "❌ Return an error response (400/403) when the redirect destination is not allowed." };
  return { pass: true, feedback: "✅ Route fixed! Redirect now validates against an allowlist." };
}

export function validateOpenRedirectPage(code: string): ValidationResult {
  if (!/ALLOWED_PATHS|allowList|allowedPaths/i.test(code))
    return { pass: false, feedback: "❌ Define an ALLOWED_PATHS allowlist in the page component too." };
  if (!/isPatched\s*&&|&&\s*isPatched/.test(code))
    return { pass: false, feedback: "❌ Add an if (isPatched && ...) guard that blocks external redirects." };
  if (!/blocked|setStatus.*blocked|show.*blocked/i.test(code))
    return { pass: false, feedback: "❌ Show a 'Blocked' UI state instead of redirecting when the patch is active." };
  return { pass: true, feedback: "✅ Page fixed! External redirects are blocked when the patch is active." };
}

// ── XSS Profile Bio ───────────────────────────────────────────────────────────

export function validateXssProfile(code: string): ValidationResult {
  if (/dangerouslySetInnerHTML/.test(code))
    return { pass: false, feedback: "❌ dangerouslySetInnerHTML is still present — remove it entirely." };
  if (!/\{bio\}|\{\s*bio\s*\}/.test(code))
    return { pass: false, feedback: "❌ Render bio as a JSX text node: {bio}. Don't use __html." };
  return { pass: true, feedback: "✅ Correct! React auto-escapes {bio}, preventing XSS execution." };
}

// ── Mass Assignment ───────────────────────────────────────────────────────────

export function validateMassAssignment(code: string): ValidationResult {
  if (/Object\.keys\(body\)/.test(code) && !/ALLOWED_FIELDS|allowedFields|whitelist/i.test(code))
    return { pass: false, feedback: "❌ Still using Object.keys(body) with no field filtering — add an allowlist." };
  if (!/ALLOWED_FIELDS|allowedFields|whitelist/i.test(code))
    return { pass: false, feedback: "❌ Define an ALLOWED_FIELDS allowlist (e.g. [\"username\", \"email\", \"bio\"]) to filter the body." };
  if (!/filter|includes/.test(code))
    return { pass: false, feedback: "❌ Filter body keys against the allowlist — only permitted fields should reach the SQL query." };
  if (/role.*=.*body|balance.*=.*body|body.*role|body.*balance/.test(code.replace(/\s+/g, " ")))
    return { pass: false, feedback: "❌ Still allowing role or balance to be passed from the body — they must be excluded." };
  if (/debug.*updatedFields|updatedFields.*debug/.test(code.replace(/\s+/g, " ")))
    return { pass: false, feedback: "❌ Remove the debug.updatedFields from the response — it leaks internal state." };
  return { pass: true, feedback: "✅ Fixed! Only allowlisted fields reach the UPDATE query — role/balance are protected." };
}

// ── SSRF ──────────────────────────────────────────────────────────────────────

export function validateSsrf(code: string): ValidationResult {
  if (!/PRIVATE_IP_PATTERNS|denyList|denylist|blocklist|BLOCK_LIST|privateIp/i.test(code))
    return { pass: false, feedback: "❌ Define a PRIVATE_IP_PATTERNS denylist (array of RegExps covering 127.x, 10.x, 192.168.x, 169.254.x)." };
  if (!/\.some\(|\.test\(|\.includes\(/i.test(code))
    return { pass: false, feedback: "❌ Test the URL against your denylist patterns before fetching (e.g. patterns.some(p => p.test(url)))." };
  if (!/403|Forbidden|not permitted|blocked|denied/i.test(code))
    return { pass: false, feedback: "❌ Return a 403 response when the URL matches a blocked pattern." };
  if (/\/\/ 🔴 FIX THIS/.test(code))
    return { pass: false, feedback: "❌ The '🔴 FIX THIS' comment is still present — make sure you've implemented the actual check." };
  return { pass: true, feedback: "✅ SSRF patched! The server now rejects requests to private/internal IP ranges." };
}

