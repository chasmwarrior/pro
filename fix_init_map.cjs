const fs = require('fs');
let code = fs.readFileSync('src/components/MapLibreView.tsx', 'utf-8');

const target = `      return () => {
        resizeObserver.disconnect();
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    } catch (err: any) {
      console.error('Failed to initialize MapLibre map:', err);
      setMapError('WebGL is disabled or unsupported in this container/browser.');
    }
  }, []);`;

const replace = `    }; // End of initMap
    
    initMap();

    return () => {
      if (initTimeout) clearTimeout(initTimeout);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  } catch (err: any) {
    console.error('Failed to initialize MapLibre map:', err);
    setMapError('WebGL is disabled or unsupported in this container/browser.');
  }
  }; // Outer wrapper
  
  initMap();

  return () => {
    if (initTimeout) clearTimeout(initTimeout);
    // Cleanup will be handled inside initMap, but we need to pass a way to clean up if unmounted early.
  };
  }, []);`;

// wait, this is tricky to string replace perfectly without seeing the whole function. Let's just rewrite the whole useEffect.
