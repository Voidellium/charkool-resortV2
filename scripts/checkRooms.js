import prisma from '../src/lib/prisma.js';

async function main() {
  const rooms = await prisma.room.findMany({
    select: { id: true, name: true, image: true },
  });
  console.table(rooms);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
