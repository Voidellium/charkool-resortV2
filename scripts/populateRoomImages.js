import prisma from '../src/lib/prisma.js';

async function main() {
  const defaultImages = {
    'Loft': '/images/standard.jpg',
    'Tepee': '/images/Deluxe.jpg',
    'Villa': '/images/suite.jpg',
    'Family Lodge': '/images/beachfront.jpg',
  };

  for (const [name, image] of Object.entries(defaultImages)) {
    const updated = await prisma.room.updateMany({
      where: { name, image: null }, // Only update if no image exists
      data: { image },
    });
    console.log(`✅ Updated ${updated.count} room(s) for ${name}`);
  }
}

main()
  .then(() => {
    console.log('All default images have been populated!');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
