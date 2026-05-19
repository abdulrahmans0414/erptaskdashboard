import { execSync } from 'child_process';
try {
    const out = execSync('git log -n 5 --oneline', { encoding: 'utf8' });
    console.log("GIT LOG:");
    console.log(out);
    const diff = execSync('git diff HEAD~1 backend/controllers/tasks/taskController.js', { encoding: 'utf8' });
    console.log("GIT DIFF OF taskController.js:");
    console.log(diff);
} catch (e) {
    console.error(e.message);
    if (e.stderr) console.error(e.stderr.toString());
}
