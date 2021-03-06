import Component from '@ember/component';
import layout from '../templates/components/nav-stack';
import { computed, get } from '@ember/object';
import { inject as service } from '@ember/service';
import { run, scheduleOnce } from '@ember/runloop';
import { observer } from '@ember/object';

import { nextTick, computeTimeout, setTransformTranslateStyle } from 'ember-nav-stack/utils/animation'

export default Component.extend({
  layer: null, // PT.number.isRequired
  footer: null, // componentRef, optional
  birdsEyeDebugging: false, // PT.bool, optional
  navStacksService: service('nav-stacks'),
  layout,
  classNames: ['NavStack'],
  classNameBindings: ['layerIndexCssClass', 'hasFooter:NavStack--withFooter', 'birdsEyeDebugging:is-birdsEyeDebugging'],
  layerIndexCssClass: computed('layer', function() {
    return `NavStack--layer${this.get('layer')}`;
  }),
  headerComponent: computed.readOnly('stackItems.lastObject.headerComponent'),
  stackItems: computed('layer', 'navStacksService.stacks', function(){
    return this.get(`navStacksService.stacks.layer${this.get('layer')}`);
  }),
  stackDepth: computed.readOnly('stackItems.length'),
  components: computed.mapBy('stackItems', 'component'),
  hasFooter: computed.bool('footer'),
  headerTransitionRules,
  didInsertElement(){
    this._super(...arguments);
    scheduleOnce('afterRender', this, this.handleStackDepthChange, true);
  },
  stackDepthChanged: observer('stackItems', function() {
    this.handleStackDepthChange();
  }),

  handleStackDepthChange(initialRender = false) {
    let stackDepth = this.get('stackItems.length') || 0;
    let rootComponentRef = this.get('stackItems.firstObject.component');
    let rootComponentIdentifier = getComponentIdentifier(rootComponentRef);
    let headerAnimation = 'cut';

    let layer = this.get('layer');
    if (initialRender) {
      this.schedule(this.cut);
    }

    else if (layer > 0 && stackDepth > 0 && this._stackDepth === 0) {
      this.schedule(this.slideUp);
    }

    else if (layer > 0 && stackDepth === 0 && this._stackDepth > 0) {
      this.cloneElement();
      this.element.style.display = 'none';
      this.schedule(this.slideDown);

    } else if (stackDepth === 1 && rootComponentIdentifier !== this._rootComponentIdentifier) {
      this.schedule(this.cut);

    } else if (stackDepth < this._stackDepth) {
      this.cloneLastStackItem();
      this.schedule(this.slideBack);
      headerAnimation = 'slideBack';

    } else if (stackDepth > this._stackDepth) {
      this.schedule(this.slideForward);
      headerAnimation = 'slideForward';
    }

    this.setHeaderInfo(headerAnimation);
    this._stackDepth = stackDepth;
    this._rootComponentIdentifier = rootComponentIdentifier;
  },

  setHeaderInfo(enterAnimation = 'cut') {
    this.set('headerInfo', {
      component: this.get('stackItems.lastObject.headerComponent'),
      enterAnimation
    });
  },

  schedule(method) {
    scheduleOnce('afterRender', this, method);
  },

  computeXPosition() {
    let stackDepth = this.get('stackDepth');
    let layerX = `${(stackDepth - 1) * -20}%`;
    return layerX;
  },

  cut() {
    let { element } = this;
    let x = this.computeXPosition();
    let stackItemEl = element.querySelector('.NavStack-itemContainer')
    stackItemEl.classList.add('isCutting');
    this.transition(stackItemEl, 'X', x, () => {
      stackItemEl.classList.remove('isCutting');
    });

    if (this.get('layer') > 0 & this.get('stackDepth') > 0) {
      element.classList.add('isCutting');
      setTransformTranslateStyle(element, 'Y', '0px');
      this.transition(this.element, 'Y', '0px', () => {
        element.classList.remove('isCutting');
      });
    }
  },

  slideForward() {
    let element = this.element.querySelector('.NavStack-itemContainer')
    let x = this.computeXPosition();
    this.transition(element, 'X', x);
  },

  slideBack() {
    let element = this.element.querySelector('.NavStack-itemContainer')
    let x = this.computeXPosition();

    this.transition(element, 'X', x, () => {
      if (this.$clonedStackItem) {
        this.$clonedStackItem.remove();
        this.$clonedStackItem = null;
      }
    });
  },

  slideUp() {
    this.transition(this.element, 'Y', '0px');
  },

  slideDown() {
    let debug = this.get('birdsEyeDebugging');
    let y = debug ? '480px' : '100vh';
    this.transition(this.$clonedElement[0], 'Y', y, () => {
      if (this.$clonedElement) {
        this.$clonedElement.remove();
        this.$clonedElement = null;
      }
    });
  },

  transition(element, plane, amount, finishCallback) {
    this.transitionDidBegin();
    setTransformTranslateStyle(element, plane, amount);

    nextTick().then(() => {
      run.later(() => {
        this.transitionDidEnd();
        if (finishCallback) {
          finishCallback();
        }
      }, computeTimeout(element) || 0);
    });
  },
  transitionDidBegin(){},
  transitionDidEnd(){},

  cloneLastStackItem() {
    let clone = this.$clonedStackItem = this.$('.NavStack-item:last-child').clone();
    clone.attr('id', `${this.elementId}_$clonedStackItem`);
    this.attachClonedStackItem(clone);
  },
  cloneElement() {
    let clone = this.$clonedElement = this.$().clone();
    clone.attr('id', `${this.elementId}_clone`);
    this.attachClonedElement(clone);
  },
  attachClonedStackItem(clone) {
    this.$('.NavStack-itemContainer').append(clone);
  },
  attachClonedElement(clone) {
    this.$().parent().append(clone);
    clone.css('transform'); // force layout, without this CSS transition does not run
  }
});

function headerTransitionRules() {
  this.transition(
    this.use('slideTitle', 'left'),
    this.toValue(function(newValue) {
      return newValue.enterAnimation === 'slideForward';
    })
  );

  this.transition(
    this.use('slideTitle', 'right'),
    this.toValue(function(newValue) {
      return newValue.enterAnimation === 'slideBack';
    })
  );
}

function getComponentIdentifier(componentRef) {
  if (!componentRef) {
    return 'none';
  }
  let result = componentRef.name;
  if (componentRef.args.named.model) {
    let model = componentRef.args.named.model.value();
    if (model) {
      result += `:${get(model, 'id')}`;
    }
  } else if (componentRef.args.named.has && componentRef.args.named.has('model')) {
    let model = componentRef.args.named.get('model').value();
    if (model) {
      let modelId = get(model, 'id');
      if (modelId) {
        result += `:${modelId}`;
      }
    }
  }
  return result;
}
