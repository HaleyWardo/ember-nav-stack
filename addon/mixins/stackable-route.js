import Mixin from '@ember/object/mixin';
import { computed } from '@ember/object';

export function getParentRoute(router, route) {
  let routerMicroLib = router._routerMicrolib;
  let { handlerInfos } = routerMicroLib.state;
  if (!handlerInfos) {
    return;
  }
  let routes = handlerInfos.map(hi => hi._handler);
  let routeIndex = routes.indexOf(route);
  if (routeIndex > 0) {
    return routes[routes.indexOf(route) - 1];
  }
}

export default Mixin.create({
  templateName: 'stackable',
  getRouteComponent(/* model */) {
    return `routable-components/${(this.routableTemplateName || this.routeName).replace(/\./g,'/')}`;
  },
  getHeaderComponent(model) {
    return `${this.getRouteComponent(model)}/header`;
  },
  layerIndex: computed(function() {
    let parentRoute = getParentRoute(this.router, this);
    let parentRouteLayerIndex = parentRoute.get('layerIndex');
    let currentLayerIndex = parentRouteLayerIndex || 0;
    if (this.get('newLayer') === true) {
      return currentLayerIndex + 1;
    }
    return currentLayerIndex;
  }),
  setupController(controller, model) {
    this._super(controller, model);
    controller.setProperties({
      layerIndex: this.get('layerIndex'),
      routeComponent: this.getRouteComponent(model),
      headerComponent: this.getHeaderComponent(model),
      routeName: this.routeName
    });
  },
  getParentRouteName() {
    return getParentRoute(this.router, this).routeName;
  },
  actions: {
    back() {
      this.transitionTo(this.getParentRouteName());
    },
  }
});
