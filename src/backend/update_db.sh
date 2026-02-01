DIR=$(dirname "$0") # directory of THIS script (should be in backend)
cd "$DIR";

npx prisma migrate reset
npx prisma db push