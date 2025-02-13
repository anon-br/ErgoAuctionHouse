import React, {Fragment} from 'react';
import {Bar} from 'react-chartjs-2';
import {
    Button,
    Col,
    Container, Form, FormFeedback, FormGroup, FormText, Input, InputGroup, InputGroupAddon, InputGroupText, Label,
    Modal,
    ModalBody, ModalFooter,
    ModalHeader,
    Row,
    Tooltip,
} from 'reactstrap';
import {
    friendlyToken,
    getAddrUrl,
    getTxUrl, getWalletAddress,
    showMsg,
} from '../../../auction/helpers';
import SyncLoader from 'react-spinners/SyncLoader';
import {css} from '@emotion/core';
import {allAuctionTrees, auctionFee, boxById, currentHeight, txById} from '../../../auction/explorer';
import moment from 'moment';
import {ResponsiveContainer} from 'recharts';
import PropagateLoader from 'react-spinners/PropagateLoader';
import ReactTooltip from 'react-tooltip';
import {ergToNano, isFloat, isNatural} from "../../../auction/serializer";
import {auctionTxRequest, getAssets} from "../../../auction/nodeWallet";
import {getAuctionP2s, registerAuction} from "../../../auction/auctionAssembler";

const override = css`
    display: block;
    margin: 0 auto;
`;

class NewAuctionAssembler extends React.Component {
    constructor(props) {
        super();
        this.state = {
            modalLoading: false,
        }
        this.canStartAuction = this.canStartAuction.bind(this);
    }

    componentWillReceiveProps(nextProps, nextContext) {
        if (this.props.isOpen && !nextProps.isOpen) {
            this.setState({modalLoading: false, assets: {}});
        }
    }

    canStartAuction() {
        return (
            !this.state.modalLoading &&
            ergToNano(this.state.initialBid) >= 100000000 &&
            this.state.auctionDuration > 0 &&
            ergToNano(this.state.auctionStep) >= 100000000
        );
    }

    startAuction() {
        this.setState({modalLoading: true});
        currentHeight()
            .then((height) => {
                getAuctionP2s(ergToNano(this.state.initialBid), height + parseInt(this.state.auctionDuration) + 5,
                    ergToNano(this.state.auctionStep)).then(addr => {
                    let description = this.state.description;
                    if (!description) description = '';
                    registerAuction(
                        addr.address,
                        ergToNano(this.state.initialBid),
                        getWalletAddress(),
                        ergToNano(this.state.auctionStep),
                        height,
                        height + parseInt(this.state.auctionDuration) + 5, // +5 to take into account the time it takes to be mined
                        description,
                        this.state.auctionAutoExtend
                    ).then(res => {
                        this.props.close()
                        this.props.assemblerModal(addr.address, ergToNano(this.state.initialBid) - 10000000, true)

                    }).catch(err => {
                        showMsg('Error while registering the request to the assembler!', true);
                        this.setState({modalLoading: false})
                    })

                }).catch(_ => {
                    showMsg('Could not contact the assembler service.', true);
                    this.setState({modalLoading: false})
                })
            }).catch(_ => showMsg('Could not get height from the explorer, try again!', true));
    }

    render() {
        return (
            <Modal
                size="lg"
                isOpen={this.props.isOpen}
                toggle={this.props.close}
            >
                <ModalHeader toggle={this.props.close}>
                    <span className="fsize-1 text-muted">New Auction</span>
                </ModalHeader>
                <ModalBody>
                    <Container>
                        <Row>
                            <SyncLoader
                                css={override}
                                size={8}
                                color={'#0086d3'}
                                loading={this.state.modalLoading}
                            />
                        </Row>

                        <Form>
                            <FormGroup>
                                <Label for="bid">Initial Bid</Label>
                                <InputGroup>
                                    <Input
                                        type="text"
                                        invalid={
                                            ergToNano(
                                                this.state
                                                    .initialBid
                                            ) < 100000000
                                        }
                                        value={
                                            this.state.initialBid
                                        }
                                        onChange={(e) => {
                                            if (
                                                isFloat(
                                                    e.target.value
                                                )
                                            ) {
                                                this.setState({
                                                    initialBid:
                                                    e.target
                                                        .value,
                                                });
                                            }
                                        }}
                                        id="bid"
                                    />
                                    <InputGroupAddon addonType="append">
                                        <InputGroupText>
                                            ERG
                                        </InputGroupText>
                                    </InputGroupAddon>
                                    <FormFeedback invalid>
                                        Must be at least 0.1 ERG
                                    </FormFeedback>
                                </InputGroup>
                                <FormText>
                                    Specify initial bid of the
                                    auction.
                                </FormText>
                            </FormGroup>
                            <div className="divider"/>
                            <Row>
                                <Col md="6">
                                    <FormGroup>
                                        <Label for="auctionStep">
                                            Minimum Step
                                        </Label>
                                        <InputGroup>
                                            <Input
                                                type="text"
                                                invalid={
                                                    ergToNano(
                                                        this.state
                                                            .auctionStep
                                                    ) < 100000000
                                                }
                                                value={
                                                    this.state.auctionStep
                                                }
                                                onChange={(e) => {
                                                    if (
                                                        isFloat(
                                                            e.target.value
                                                        )
                                                    ) {
                                                        this.setState({
                                                            auctionStep:
                                                            e.target
                                                                .value,
                                                        });
                                                    }
                                                }}
                                                id="auctionStep"
                                            />
                                            <InputGroupAddon addonType="append">
                                                <InputGroupText>
                                                    ERG
                                                </InputGroupText>
                                            </InputGroupAddon>
                                            <FormFeedback invalid>
                                                Must be at least 0.1 ERG
                                            </FormFeedback>
                                        </InputGroup>
                                        <FormText>
                                            The bidder must increase the bid
                                            by at least this value.
                                        </FormText>
                                    </FormGroup>
                                </Col>
                                <Col md="6">
                                    <FormGroup>
                                        <Label for="duration">
                                            Auction Duration
                                        </Label>
                                        <InputGroup>
                                            <InputGroupAddon addonType="prepend">
                                                <InputGroupText>
                                                    <Label check>
                                                        <Input
                                                            checked={
                                                                this.state
                                                                    .auctionAutoExtend
                                                            }
                                                            onChange={(e) =>
                                                                this.setState(
                                                                    {
                                                                        auctionAutoExtend:
                                                                        e
                                                                            .target
                                                                            .checked,
                                                                    }
                                                                )
                                                            }
                                                            className="mr-2"
                                                            addon
                                                            type="checkbox"
                                                            aria-label="Checkbox for following text input"
                                                        />
                                                        Auto Extend
                                                    </Label>
                                                </InputGroupText>
                                            </InputGroupAddon>

                                            <Input
                                                type="number"
                                                value={
                                                    this.state
                                                        .auctionDuration
                                                }
                                                onChange={(event) => {
                                                    if (
                                                        isNatural(
                                                            event.target
                                                                .value
                                                        )
                                                    )
                                                        this.setState({
                                                            auctionDuration:
                                                            event.target
                                                                .value,
                                                        });
                                                }}
                                                id="duration"
                                            />
                                            <InputGroupAddon addonType="append">
                                                <InputGroupText>
                                                    Blocks
                                                </InputGroupText>
                                            </InputGroupAddon>
                                        </InputGroup>
                                        <FormText>
                                            Auction will last for this
                                            number of blocks (e.g. 720 for
                                            ~1 day). <br/> By enabling auto
                                            extend, your auction's duration
                                            will be extended slightly if a
                                            bid is placed near the end of
                                            the auction.
                                        </FormText>
                                    </FormGroup>
                                </Col>
                            </Row>
                            <div className="divider"/>
                            <FormGroup>
                                <Label for="description">Description</Label>
                                <Input
                                    invalid={
                                        this.state.description !==
                                        undefined &&
                                        this.state.description.length > 250
                                    }
                                    value={this.state.description}
                                    onChange={(event) =>
                                        this.setState({
                                            description: event.target.value,
                                        })
                                    }
                                    type="textarea"
                                    name="text"
                                    id="description"
                                />
                                <FormFeedback invalid>
                                    At most 250 characters!
                                </FormFeedback>
                                <FormText>
                                    You can explain about the token you are
                                    auctioning here.
                                </FormText>
                            </FormGroup>
                        </Form>
                    </Container>
                </ModalBody>
                <ModalFooter>
                    <Button
                        className="ml mr-2 btn-transition"
                        color="secondary"
                        onClick={this.props.close}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="mr-2 btn-transition"
                        color="secondary"
                        disabled={!this.canStartAuction()}
                        onClick={() => this.startAuction()}
                    >
                        Create Auction
                    </Button>
                </ModalFooter>
            </Modal>

        );
    }
}

export default NewAuctionAssembler;
