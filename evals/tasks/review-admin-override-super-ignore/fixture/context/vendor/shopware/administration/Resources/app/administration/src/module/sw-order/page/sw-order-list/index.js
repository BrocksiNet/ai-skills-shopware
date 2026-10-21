import template from './sw-order-list.html.twig';
import './sw-order-list.scss';

const { Mixin } = Shopware;
const { Criteria } = Shopware.Data;

/**
 * @sw-package checkout
 */
// eslint-disable-next-line sw-deprecation-rules/private-feature-declarations
export default {
    template,

    inject: ['repositoryFactory', 'stateStyleDataProviderService', 'acl', 'filterFactory'],

    mixins: [
        Mixin.getByName('listing'),
    ],

    computed: {
        orderRepository() {
            return this.repositoryFactory.create('order');
        },

        orderColumns() {
            return this.getOrderColumns();
        },

        orderCriteria() {
            const criteria = new Criteria(this.page, this.limit);

            criteria.setTerm(this.term);
            criteria.addAssociation('addresses');
            criteria.addAssociation('salesChannel');
            criteria.addAssociation('orderCustomer');
            criteria.addAssociation('stateMachineState');

            return criteria;
        },
    },

    methods: {
        getOrderColumns() {
            return [{
                property: 'orderNumber',
                label: 'sw-order.list.columnOrderNumber',
                routerLink: 'sw.order.detail',
                allowResize: true,
                primary: true,
            }, {
                property: 'salesChannel.name',
                label: 'sw-order.list.columnSalesChannel',
                allowResize: true,
            }, {
                property: 'orderCustomer.firstName',
                dataIndex: 'orderCustomer.lastName,orderCustomer.firstName',
                label: 'sw-order.list.columnCustomerName',
                allowResize: true,
            }, {
                property: 'amountTotal',
                label: 'sw-order.list.columnAmount',
                align: 'right',
                allowResize: true,
            }, {
                property: 'stateMachineState.name',
                label: 'sw-order.list.columnState',
                allowResize: true,
            }, {
                property: 'orderDateTime',
                label: 'sw-order.list.orderDate',
                allowResize: true,
            }];
        },
    },
};
