"""
AeroPulse AI - Unified System Launcher
Launches both the Flask AI backend (port 5000) and the Vite React frontend (port 5173).
"""

import sys
import os
import subprocess
import time
import signal

def main():
    print("==================================================================")
    print("🌦️  AeroPulse AI — Weather Monitoring & Alert System Launcher")
    print("==================================================================")

    root_dir = os.path.dirname(os.path.abspath(__file__))

    # Check Python dependencies
    print("\n[1/3] Verifying Backend environment...")
    try:
        import flask
        import sklearn
        import apscheduler
        print("  ✓ Python packages verified.")
    except ImportError as e:
        print(f"  ❌ Missing required Python package: {e}")
        print("  Run: pip install -r requirements.txt")
        sys.exit(1)

    # Check Node modules
    print("\n[2/3] Verifying Frontend environment...")
    if not os.path.exists(os.path.join(root_dir, 'node_modules')):
        print("  ❌ node_modules not found. Running npm install...")
        subprocess.run(['npm', 'install'], cwd=root_dir, shell=True, check=True)
    print("  ✓ Node dependencies verified.")

    # Launch Backend and Frontend
    print("\n[3/3] Starting Services...")
    print("  🚀 Backend:  http://localhost:5000")
    print("  🌐 Frontend: http://localhost:5173\n")
    print("Press Ctrl+C to stop all services.\n")
    print("------------------------------------------------------------------")

    processes = []
    try:
        # Start Flask backend
        backend_proc = subprocess.Popen(
            [sys.executable, 'app.py'],
            cwd=root_dir
        )
        processes.append(backend_proc)

        # Allow backend to bind port and load ML models
        time.sleep(2)

        # Start Vite frontend
        frontend_proc = subprocess.Popen(
            ['npm', 'run', 'dev'],
            cwd=root_dir,
            shell=True
        )
        processes.append(frontend_proc)

        # Keep parent alive and monitor child processes
        while True:
            for p in processes:
                ret = p.poll()
                if ret is not None:
                    print(f"\n[Warning] Process {p.pid} exited with code {ret}.")
                    return
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n\n🛑 Shutting down AeroPulse AI services gracefully...")
    finally:
        for p in processes:
            try:
                p.terminate()
                p.wait(timeout=3)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass
        print("✓ All services stopped. Goodbye!")

if __name__ == '__main__':
    main()
