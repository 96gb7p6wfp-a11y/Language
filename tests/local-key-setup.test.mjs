import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const helper = fileURLToPath(new URL("../scripts/configure-local-openai.py", import.meta.url));
const fixture = `
import importlib.util, pathlib, tempfile, subprocess, stat, os, sys
sys.dont_write_bytecode=True
spec=importlib.util.spec_from_file_location('secure_setup', ${JSON.stringify(helper)})
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
fixture=tempfile.TemporaryDirectory();root=pathlib.Path(fixture.name)
subprocess.run(['git','init','-q',str(root)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
(root/'.gitignore').write_text('.env*\\n')
sample='sk-'+'test_only_value_'*3
`;
function runPython(body) { return execFileSync("python3", ["-c", fixture + body], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }); }

test("secure import preserves unrelated env settings and replaces duplicate key assignments atomically", () => {
  assert.equal(runPython(`
target=root/'.env.local'
target.write_text('# local settings\\nOTHER_VALUE="literal $(do-not-execute)"\\nOPENAI_API_KEY=old\\n export OPENAI_API_KEY =duplicate\\nMODEL=gpt-4.1-mini')
module.save_key(root,sample)
text=target.read_text()
assert text.count('OPENAI_API_KEY=')==1
assert 'OPENAI_API_KEY='+sample+'\\n' in text
assert 'OTHER_VALUE="literal $(do-not-execute)"\\n' in text
assert text.endswith('MODEL=gpt-4.1-mini')
assert stat.S_IMODE(target.stat().st_mode)==0o600
assert not list(root.glob('.env.local.secure-*'))
print('ok')
`), "ok\n");
});

test("secure import refuses symlinks, tracked paths, nonignored destinations and unsafe key text", () => {
  assert.equal(runPython(`
def rejected():
 try:module.save_key(root,sample)
 except ValueError:return
 raise AssertionError('Unsafe destination accepted')
outside=root/'outside';outside.write_text('untouched')
target=root/'.env.local';target.symlink_to(outside);rejected()
assert outside.read_text()=='untouched';target.unlink()
target.write_text('untouched')
subprocess.run(['git','add','-f','.env.local'],cwd=root,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL);rejected()
subprocess.run(['git','rm','--cached','-q','.env.local'],cwd=root,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
(root/'.gitignore').write_text('');rejected()
(root/'.gitignore').write_text('.env*\\n')
for bad in [sample+'\\n',sample+'\\x00',sample+' ',sample+'\\rNEXT=bad','OPENAI_API_KEY='+sample]:
 try:module.save_key(root,bad)
 except ValueError:pass
 else:raise AssertionError('Unsafe key text accepted')
assert target.read_text()=='untouched'
assert not list(root.glob('.env.local.secure-*'))
print('ok')
`), "ok\n");
});

test("setup refuses piped input and command arguments without echoing input", () => {
  const input = "unit-test-input-that-must-not-be-echoed";
  const piped = spawnSync("python3", [helper], { input, encoding: "utf8" });
  assert.equal(piped.status, 1);
  assert.match(piped.stderr, /interactive workspace terminal/);
  assert.ok(!(piped.stdout + piped.stderr).includes(input));
  const argument = spawnSync("python3", [helper, input], { encoding: "utf8" });
  assert.equal(argument.status, 1);
  assert.ok(!(argument.stdout + argument.stderr).includes(input));
});
