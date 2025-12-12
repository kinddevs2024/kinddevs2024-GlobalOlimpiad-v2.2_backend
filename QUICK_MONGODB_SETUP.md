# Quick MongoDB Setup

## The Problem
Your backend is trying to connect to MongoDB at `127.0.0.1:27017` but MongoDB is not running.

## Solution: MongoDB Atlas (Easiest - 5 minutes)

### Step 1: Create Account
1. Go to: **https://www.mongodb.com/cloud/atlas/register**
2. Sign up (free account)

### Step 2: Create Cluster
1. Click **"Build a Database"**
2. Choose **FREE (M0)**
3. Select your region
4. Click **"Create"**

### Step 3: Setup Access
1. **Create Database User:**
   - Username: `olympiaduser`
   - Password: Create a strong password (SAVE IT!)
   - Click **"Create Database User"**

2. **Network Access:**
   - Click **"Add My Current IP Address"** OR
   - Click **"Allow Access from Anywhere"** (for dev: `0.0.0.0/0`)
   - Click **"Finish and Close"**

### Step 4: Get Connection String
1. Click **"Connect"** on your cluster
2. Choose **"Connect your application"**
3. Copy the connection string:
   ```
   mongodb+srv://olympiaduser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### Step 5: Update .env File
Open `.env` and replace the `MONGODB_URI` line:

```env
MONGODB_URI=mongodb+srv://olympiaduser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/olympiad-platform?retryWrites=true&w=majority
```

**Important:**
- Replace `YOUR_PASSWORD` with your actual password
- Replace `cluster0.xxxxx` with your cluster address
- Add `/olympiad-platform` before the `?` (this is the database name)

### Step 6: Restart Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 7: Test
Try your registration request again - it should work! ✅

---

## Alternative: Install Local MongoDB

### Windows
1. Download: https://www.mongodb.com/try/download/community
2. Install with default settings
3. Start service:
   ```powershell
   net start MongoDB
   ```
4. Keep `.env` as is (already configured for local)

### macOS
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

### Linux
```bash
sudo apt-get install mongodb
sudo systemctl start mongod
```

---

## Verify Connection

After setup, you should see in your server logs:
```
✅ MongoDB Connected: ...
```

Instead of:
```
❌ MongoDB Connection Error: ...
```

