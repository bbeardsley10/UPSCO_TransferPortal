# Streamlined Transfers

A web application to streamline the store-to-store transfer process. This system allows users to upload transfer PDFs from Prophet 21 and track their status across 5 locations.

## Features

- **User Authentication**: One user per location (5 locations total)
- **PDF Upload**: Upload transfer PDFs from Prophet 21
- **Transfer Tracking**: View all transfers (sent and received)
- **Status Management**: Update transfer status (pending, acknowledged, in progress, fulfilled)
- **Notes**: Add notes to transfers
- **Real-time Updates**: Automatic refresh of transfer list

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma generate
npx prisma migrate dev --name init
npx ts-node scripts/seed.ts
```

3. Create the uploads directory:
```bash
mkdir uploads
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Default Credentials

After seeding, you can log in with any of these accounts:

- **Location 1**: username=`location1`, password=`password1`
- **Location 2**: username=`location2`, password=`password2`
- **Location 3**: username=`location3`, password=`password3`
- **Location 4**: username=`location4`, password=`password4`
- **Location 5**: username=`location5`, password=`password5`

## Usage

1. **Login**: Use your location credentials to log in
2. **Upload Transfer**: Click "Upload Transfer" and select the PDF from Prophet 21, then choose the recipient location
3. **View Transfers**: See all transfers on the dashboard (filter by All, Sent, or Received)
4. **Update Status**: Click on a received transfer to view details and update status/notes
5. **Track Progress**: Monitor transfer status as it moves through: pending → acknowledged → in progress → fulfilled

## Technology Stack

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Prisma**: Database ORM
- **SQLite**: Database
- **Tailwind CSS**: Styling
- **bcryptjs**: Password hashing

## Production Deployment

For production, consider:
- Using PostgreSQL instead of SQLite
- Setting up proper session management (e.g., NextAuth.js with a database)
- Using cloud storage for PDFs (AWS S3, etc.)
- Adding email notifications
- Implementing proper error logging
- Setting up HTTPS

