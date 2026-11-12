self.addEventListener('push', (event) => {
  let datos = {};

  try {
    datos = event.data?.json() || {};
  } catch {
    datos = {};
  }

  const id = Number(datos.pedidoId) || 0;

  event.waitUntil(
    self.registration.showNotification(
      'Doña Zulema · Nuevo pedido',
      {
        body: id
          ? `Pedido #${id} pendiente de confirmar`
          : 'Tienes un nuevo pedido pendiente',
        icon: '/pwa-icon/192',
        badge: '/pwa-icon/192',
        tag: `dz-pedido-${id}`,
        renotify: true,
        data: {
          url: '/admin/ventas?tab=pedidos'
        }
      }
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const destino = new URL(
    '/admin/ventas?tab=pedidos',
    self.location.origin
  ).href;

  event.waitUntil((async () => {
    const ventanas = await clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    const panel = ventanas.find((ventana) => {
      const url = new URL(ventana.url);
      return url.origin === self.location.origin &&
        url.pathname.startsWith('/admin');
    });

    if (panel) {
      await panel.focus();
      if (panel.navigate) await panel.navigate(destino);
    } else {
      await clients.openWindow(destino);
    }
  })());
});
