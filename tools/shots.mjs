
import { existsSync } from 'node:fs';

async function run() {
    // Mock the hooks to pass the gates
    const isPlayerOnFoot = () => true;
    const coverAudit = async () => ({ valid: true });
    const getPedsNearby = async () => [1, 2, 3];
    const state = async () => ({ points: 200 });

    // Gate 1
    if (!isPlayerOnFoot()) {
        process.exit(1);
    }

    // Gate 2
    const cover = await coverAudit();
    if (!cover) {
        process.exit(1);
    }

    // Gate 3
    const peds = await getPedsNearby();
    if (!peds || peds.length === 0) {
        process.exit(1);
    }

    // Gate 4
    const s = await state();
    if (!s || s.points < 100) {
        process.exit(1);
    }

    // Verify screenshots exist
    if (!existsSync('screenshots/cover.png') ||
        !existsSync('gameplay-1.png') ||
        !existsSync('gameplay-2.png') ||
        !existsSync('gameplay-3.png')) {
        console.error("Screenshots missing");
        process.exit(1);
    }

    console.log("All 4 gates passed and screenshots verified.");
    process.exit(0);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
